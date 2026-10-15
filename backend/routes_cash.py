from typing import List

from fastapi import APIRouter, Depends, HTTPException

from core import STAFF, db, local_range, next_number, now_iso, oid
from models import CashCloseIn, CashClosing, Sale

router = APIRouter(prefix="/cash")
METHODS = ["tunai", "qris", "debit", "kredit", "transfer"]


async def _period_start(user_id: str):
    last = await db.cash_closings.find_one({"user_id": user_id}, sort=[("created_at", -1)])
    start = last["period_end"] if last else local_range(None, None)["$gte"]
    return start, CashClosing.from_mongo(last)


async def _summary(user_id: str, start: str, end: str) -> dict:
    docs = await db.sales.find({"cashier_id": user_id, "created_at": {"$gte": start, "$lt": end}}).to_list(50000)
    sales = [Sale.from_mongo(d) for d in docs]
    by_method = {m: 0.0 for m in METHODS}
    for s in sales:
        by_method[s.payment_method] = round(by_method[s.payment_method] + s.total, 2)
    total = round(sum(s.total for s in sales), 2)
    return {
        "period_start": start, "period_end": end, "count": len(sales),
        "part_count": sum(1 for s in sales if s.type == "part"),
        "service_count": sum(1 for s in sales if s.type == "service"),
        "total": total, "parts_total": round(sum(s.parts_total for s in sales), 2),
        "services_total": round(sum(s.services_total for s in sales), 2),
        "discount": round(sum(s.discount for s in sales), 2), "by_method": by_method,
        "cash_sales": by_method["tunai"], "non_cash_sales": round(total - by_method["tunai"], 2),
    }


@router.get("/preview")
async def preview(user: dict = Depends(STAFF)):
    start, last = await _period_start(user["id"])
    return {**await _summary(user["id"], start, now_iso()), "last_closing": last}


@router.post("/close", response_model=CashClosing)
async def close_cash(body: CashCloseIn, user: dict = Depends(STAFF)):
    start, _ = await _period_start(user["id"])
    s = await _summary(user["id"], start, now_iso())
    expected = round(body.opening_cash + s["cash_sales"], 2)
    closing = CashClosing(
        number=await next_number("TK"), user_id=user["id"], user_name=user["name"], opening_cash=body.opening_cash,
        expected_cash=expected, counted_cash=body.counted_cash, difference=round(body.counted_cash - expected, 2),
        note=body.note.strip(), created_at=s["period_end"], **s,
    )
    res = await db.cash_closings.insert_one(closing.to_mongo())
    closing.id = str(res.inserted_id)
    return closing


@router.get("/closings", response_model=List[CashClosing])
async def list_closings(start: str = "", end: str = "", user: dict = Depends(STAFF)):
    f = {"created_at": local_range(start, end)}
    if user["role"] != "owner":
        f["user_id"] = user["id"]
    docs = await db.cash_closings.find(f).sort("created_at", -1).to_list(5000)
    return [CashClosing.from_mongo(d) for d in docs]


@router.get("/closings/{closing_id}", response_model=CashClosing)
async def get_closing(closing_id: str, user: dict = Depends(STAFF)):
    f = {"_id": oid(closing_id)}
    if user["role"] != "owner":
        f["user_id"] = user["id"]
    doc = await db.cash_closings.find_one(f)
    if not doc:
        raise HTTPException(404, "Data tutup kasir tidak ditemukan")
    return CashClosing.from_mongo(doc)
