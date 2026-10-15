from typing import Dict, List, Optional

from bson import ObjectId
from fastapi import HTTPException
from pymongo import ReturnDocument

from core import db, now_iso, oid
from models import Line, LineIn, ServiceLine, ServiceLineIn, StockMove


async def log_move(item: dict, mtype: str, qty: float, ref: str = "", note: str = "", user: str = ""):
    move = StockMove(
        item_id=str(item["_id"]), code=item["code"], name=item["name"], type=mtype, qty=qty,
        stock_after=item.get("stock", 0), ref=ref, note=note, user=user, created_at=now_iso(),
    )
    await db.stock_moves.insert_one(move.to_mongo())


def _need(lines) -> Dict[str, float]:
    need: Dict[str, float] = {}
    for line in lines:
        need[line.item_id] = need.get(line.item_id, 0) + line.qty
    return need


async def resolve_lines(
    lines: List[LineIn], price_mode: str, check_stock: bool = False,
    user_name: str = "", reserved: Optional[Dict[str, float]] = None,
) -> List[Line]:
    if not lines:
        return []
    docs = {str(d["_id"]): d async for d in db.items.find({"_id": {"$in": [oid(x.item_id) for x in lines]}})}
    out = []
    for x in lines:
        d = docs.get(x.item_id)
        if not d:
            raise HTTPException(404, "Barang tidak ditemukan")
        if price_mode == "sell":
            price = d["sell_price"]
        elif price_mode == "buy":
            price = x.price if x.price is not None else d["buy_price"]
        else:
            price = x.price if x.price is not None else d["sell_price"]
        out.append(Line(
            item_id=x.item_id, code=d["code"], name=d["name"], unit=d.get("unit", "pcs"), qty=x.qty,
            price=price, subtotal=round(price * x.qty, 2), cost=d.get("buy_price", 0),
            added_by=user_name, added_at=now_iso() if user_name else "",
        ))
    if check_stock:
        for iid, q in _need(lines).items():
            total = q + (reserved or {}).get(iid, 0)
            if total > docs[iid]["stock"]:
                raise HTTPException(400, f"Stok {docs[iid]['name']} tidak cukup (tersedia {docs[iid]['stock']:g})")
    return out


async def resolve_services(lines: List[ServiceLineIn]) -> List[ServiceLine]:
    out = []
    for s in lines:
        d = await db.services.find_one({"_id": oid(s.service_id)})
        if not d:
            raise HTTPException(404, "Jasa tidak ditemukan")
        out.append(ServiceLine(service_id=s.service_id, name=d["name"], price=s.price if s.price is not None else d["price"]))
    return out


async def take_stock(lines: List[Line], ref: str, user: str):
    done, after = [], {}
    for iid, q in _need(lines).items():
        d = await db.items.find_one_and_update(
            {"_id": ObjectId(iid), "stock": {"$gte": q}}, {"$inc": {"stock": -q}},
            return_document=ReturnDocument.AFTER,
        )
        if not d:
            for did, dq in done:
                await db.items.update_one({"_id": ObjectId(did)}, {"$inc": {"stock": dq}})
            item = await db.items.find_one({"_id": ObjectId(iid)})
            raise HTTPException(400, f"Stok {item['name'] if item else 'barang'} tidak cukup")
        done.append((iid, q))
        after[iid] = (d, q)
    for d, q in after.values():
        await log_move(d, "out", q, ref, "", user)


async def add_stock(lines: List[Line], ref: str, user: str, update_buy: bool):
    for line in lines:
        update = {"$inc": {"stock": line.qty}}
        if update_buy:
            update["$set"] = {"buy_price": line.price}
        d = await db.items.find_one_and_update(
            {"_id": ObjectId(line.item_id)}, update, return_document=ReturnDocument.AFTER
        )
        await log_move(d, "in", line.qty, ref, "", user)
