from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pymongo import ReturnDocument

from core import (
    OWNER, STAFF, db, local_range, next_number, norm_plate, now_iso, oid, plate_key, rx, today_local,
)
from models import (
    Customer, LineIn, PaymentIn, Purchase, PurchaseIn, Sale, SaleIn, StockAdjustIn, StockMove, Vehicle,
    WOAddParts, WOCreate, WorkOrder, WOStatusIn, WOUpdate,
)
from stock import add_stock, log_move, resolve_lines, resolve_services, take_stock

router = APIRouter()
ACTIVE = ["diterima", "dikerjakan", "selesai"]


def settle(subtotal: float, p: PaymentIn) -> dict:
    if p.discount > subtotal:
        raise HTTPException(400, "Diskon melebihi subtotal")
    total = round(subtotal - p.discount, 2)
    if p.method == "tunai":
        if p.paid_amount < total:
            raise HTTPException(400, "Uang yang dibayarkan kurang dari total")
        paid, change = p.paid_amount, round(p.paid_amount - total, 2)
    else:
        paid, change = total, 0
    return dict(subtotal=subtotal, discount=p.discount, total=total, payment_method=p.method,
                payment_ref=p.ref.strip(), paid_amount=paid, change=change)


def totals(parts, services) -> dict:
    pt = round(sum(p.subtotal for p in parts), 2)
    st = round(sum(s.price for s in services), 2)
    return {"parts_total": pt, "services_total": st, "estimate_total": round(pt + st, 2)}


async def get_wo(wo_id: str) -> WorkOrder:
    wo = WorkOrder.from_mongo(await db.work_orders.find_one({"_id": oid(wo_id)}))
    if not wo:
        raise HTTPException(404, "Work order tidak ditemukan")
    return wo


def ensure_open(wo: WorkOrder):
    if wo.status not in ACTIVE:
        raise HTTPException(400, f"Servis sudah {wo.status}, data tidak dapat diubah")


async def get_mechanic(mid: str) -> dict:
    m = await db.mechanics.find_one({"_id": oid(mid)})
    if not m:
        raise HTTPException(400, "Mekanik tidak ditemukan")
    return m


# ---------- Sales (penjualan part tanpa jasa) ----------
@router.post("/sales", response_model=Sale)
async def create_sale(body: SaleIn, user: dict = Depends(STAFF)):
    lines = await resolve_lines(body.items, "sell", check_stock=True)
    subtotal = round(sum(x.subtotal for x in lines), 2)
    pay = settle(subtotal, body.payment)
    number = await next_number("TRX")
    await take_stock(lines, number, user["name"])
    sale = Sale(
        number=number, type="part", customer_name=body.customer_name.strip(), customer_phone=body.customer_phone.strip(),
        items=lines, parts_total=subtotal, cost_total=round(sum(x.cost * x.qty for x in lines), 2),
        cashier=user["name"], cashier_id=user["id"], created_at=now_iso(), **pay,
    )
    res = await db.sales.insert_one(sale.to_mongo())
    sale.id = str(res.inserted_id)
    return sale


@router.get("/sales", response_model=List[Sale])
async def list_sales(start: str = "", end: str = "", type: str = "", q: str = "", user: dict = Depends(STAFF)):
    if user["role"] == "kasir":
        start = end = today_local().isoformat()
    f = {"created_at": local_range(start, end)}
    if type in ("part", "service"):
        f["type"] = type
    if q.strip():
        f["$or"] = [{"number": rx(q)}, {"customer_name": rx(q)}, {"plate": rx(q)}]
    return [Sale.from_mongo(d) for d in await db.sales.find(f).sort("created_at", -1).to_list(5000)]


@router.get("/sales/{sale_id}", response_model=Sale)
async def get_sale(sale_id: str, _=Depends(STAFF)):
    s = await db.sales.find_one({"_id": oid(sale_id)})
    if not s:
        raise HTTPException(404, "Transaksi tidak ditemukan")
    return Sale.from_mongo(s)


# ---------- Purchases ----------
@router.post("/purchases", response_model=Purchase)
async def create_purchase(body: PurchaseIn, user: dict = Depends(STAFF)):
    sup = await db.suppliers.find_one({"_id": oid(body.supplier_id)})
    if not sup:
        raise HTTPException(400, "Supplier tidak ditemukan")
    lines = await resolve_lines(body.items, "buy")
    number = await next_number("PB")
    await add_stock(lines, number, user["name"], body.update_buy_price)
    p = Purchase(
        number=number, supplier_id=body.supplier_id, supplier_name=sup["name"], invoice_no=body.invoice_no.strip(),
        date=body.date, items=lines, total=round(sum(x.subtotal for x in lines), 2), note=body.note,
        created_by=user["name"], created_at=now_iso(),
    )
    res = await db.purchases.insert_one(p.to_mongo())
    p.id = str(res.inserted_id)
    return p


@router.get("/purchases", response_model=List[Purchase])
async def list_purchases(start: str = "", end: str = "", _=Depends(STAFF)):
    docs = await db.purchases.find({"created_at": local_range(start, end)}).sort("created_at", -1).to_list(5000)
    return [Purchase.from_mongo(d) for d in docs]


# ---------- Work orders (penerimaan kendaraan + estimasi) ----------
async def _upsert_customer_vehicle(body: WOCreate, plate: str, key: str):
    cdata = {"name": body.customer_name.strip(), "phone": body.customer_phone.strip(), "address": body.customer_address.strip()}
    vehicle = await db.vehicles.find_one({"plate_key": key})
    cust = None
    if vehicle and vehicle.get("customer_id") and ObjectId.is_valid(vehicle["customer_id"]):
        cust = await db.customers.find_one({"_id": ObjectId(vehicle["customer_id"])})
        if cust and cdata["phone"] and cust.get("phone") and cust["phone"] != cdata["phone"] \
                and cust["name"].lower() != cdata["name"].lower():
            cust = None
    if not cust and cdata["phone"]:
        cust = await db.customers.find_one({"phone": cdata["phone"]})
    if cust:
        await db.customers.update_one({"_id": cust["_id"]}, {"$set": cdata})
        cid = str(cust["_id"])
    else:
        res = await db.customers.insert_one(Customer(**cdata, created_at=now_iso()).to_mongo())
        cid = str(res.inserted_id)
    await db.vehicles.update_many({"customer_id": cid}, {"$set": {"customer_name": cdata["name"], "customer_phone": cdata["phone"]}})
    vdata = {"plate": plate, "plate_key": key, "brand": body.brand.strip(), "model": body.model.strip(),
             "year": body.year.strip(), "color": body.color.strip(), "customer_id": cid,
             "customer_name": cdata["name"], "customer_phone": cdata["phone"]}
    if vehicle:
        await db.vehicles.update_one({"_id": vehicle["_id"]}, {"$set": vdata})
        vid = str(vehicle["_id"])
    else:
        res = await db.vehicles.insert_one(Vehicle(**vdata, created_at=now_iso()).to_mongo())
        vid = str(res.inserted_id)
    return cid, vid, cdata


@router.post("/work-orders", response_model=WorkOrder)
async def create_wo(body: WOCreate, user: dict = Depends(STAFF)):
    plate = norm_plate(body.plate)
    key = plate_key(plate)
    if not key:
        raise HTTPException(400, "Nomor polisi wajib diisi")
    active = await db.work_orders.find_one({"plate_key": key, "status": {"$in": ACTIVE}})
    if active:
        raise HTTPException(400, f"Kendaraan {plate} masih memiliki servis aktif ({active['number']})")
    mech = await get_mechanic(body.mechanic_id)
    parts = await resolve_lines(body.parts, "sell", check_stock=True, user_name=user["name"])
    services = await resolve_services(body.services)
    cid, vid, cdata = await _upsert_customer_vehicle(body, plate, key)
    desc = " ".join(x for x in (body.brand.strip(), body.model.strip(), body.year.strip()) if x)
    wo = WorkOrder(
        number=await next_number("WO"), customer_id=cid, customer_name=cdata["name"], customer_phone=cdata["phone"],
        vehicle_id=vid, plate=plate, plate_key=key, vehicle_desc=desc, km=body.km.strip(), complaint=body.complaint.strip(),
        mechanic_id=body.mechanic_id, mechanic_name=mech["name"], parts=parts, services=services,
        next_service_date=body.next_service_date, note=body.note.strip(), created_by=user["name"],
        created_at=now_iso(), updated_at=now_iso(), **totals(parts, services),
    )
    res = await db.work_orders.insert_one(wo.to_mongo())
    wo.id = str(res.inserted_id)
    return wo


@router.get("/work-orders", response_model=List[WorkOrder])
async def list_wo(q: str = "", status: str = "active", _=Depends(STAFF)):
    f = {}
    if status == "active":
        f["status"] = {"$in": ACTIVE}
    elif status != "all":
        f["status"] = status
    if q.strip():
        f["$or"] = [{"plate_key": rx(plate_key(q) or q)}, {"number": rx(q)}, {"customer_name": rx(q)}]
    docs = await db.work_orders.find(f).sort("created_at", -1).to_list(1000)
    return [WorkOrder.from_mongo(d) for d in docs]


@router.get("/work-orders/{wo_id}", response_model=WorkOrder)
async def read_wo(wo_id: str, _=Depends(STAFF)):
    return await get_wo(wo_id)


async def _save_wo(wo: WorkOrder) -> WorkOrder:
    wo.updated_at = now_iso()
    await db.work_orders.replace_one({"_id": ObjectId(wo.id)}, wo.to_mongo())
    return wo


@router.put("/work-orders/{wo_id}", response_model=WorkOrder)
async def update_wo(wo_id: str, body: WOUpdate, user: dict = Depends(OWNER)):
    wo = await get_wo(wo_id)
    ensure_open(wo)
    mech = await get_mechanic(body.mechanic_id)
    wo.parts = await resolve_lines(body.parts, "given", check_stock=True, user_name=user["name"])
    wo.services = await resolve_services(body.services)
    wo.km, wo.complaint, wo.note = body.km.strip(), body.complaint.strip(), body.note.strip()
    wo.mechanic_id, wo.mechanic_name = body.mechanic_id, mech["name"]
    wo.next_service_date = body.next_service_date
    for k, v in totals(wo.parts, wo.services).items():
        setattr(wo, k, v)
    return await _save_wo(wo)


@router.post("/work-orders/{wo_id}/parts", response_model=WorkOrder)
async def add_wo_parts(wo_id: str, body: WOAddParts, user: dict = Depends(STAFF)):
    wo = await get_wo(wo_id)
    ensure_open(wo)
    reserved = {}
    for p in wo.parts:
        reserved[p.item_id] = reserved.get(p.item_id, 0) + p.qty
    wo.parts = wo.parts + await resolve_lines(body.parts, "sell", True, user["name"], reserved)
    for k, v in totals(wo.parts, wo.services).items():
        setattr(wo, k, v)
    return await _save_wo(wo)


@router.patch("/work-orders/{wo_id}/status", response_model=WorkOrder)
async def set_wo_status(wo_id: str, body: WOStatusIn, user: dict = Depends(STAFF)):
    wo = await get_wo(wo_id)
    ensure_open(wo)
    if body.status == "batal" and user["role"] != "owner":
        raise HTTPException(403, "Hanya owner yang dapat membatalkan servis")
    wo.status = body.status
    return await _save_wo(wo)


@router.post("/work-orders/{wo_id}/pay", response_model=Sale)
async def pay_wo(wo_id: str, body: PaymentIn, user: dict = Depends(STAFF)):
    wo = await get_wo(wo_id)
    ensure_open(wo)
    if not wo.parts and not wo.services:
        raise HTTPException(400, "Work order belum memiliki part atau jasa")
    pay = settle(wo.estimate_total, body)
    number = await next_number("TRX")
    if wo.parts:
        await take_stock(wo.parts, number, user["name"])
    sale = Sale(
        number=number, type="service", work_order_id=wo.id, work_order_number=wo.number,
        customer_name=wo.customer_name, customer_phone=wo.customer_phone, plate=wo.plate, vehicle_desc=wo.vehicle_desc,
        km=wo.km, mechanic_id=wo.mechanic_id, mechanic_name=wo.mechanic_name, items=wo.parts, services=wo.services,
        parts_total=wo.parts_total, services_total=wo.services_total,
        cost_total=round(sum(x.cost * x.qty for x in wo.parts), 2), cashier=user["name"], cashier_id=user["id"],
        next_service_date=wo.next_service_date, created_at=now_iso(), **pay,
    )
    res = await db.sales.insert_one(sale.to_mongo())
    sale.id = str(res.inserted_id)
    wo.status, wo.sale_id, wo.sale_number, wo.paid_at = "dibayar", sale.id, number, now_iso()
    await _save_wo(wo)
    if wo.vehicle_id and ObjectId.is_valid(wo.vehicle_id):
        await db.vehicles.update_one({"_id": ObjectId(wo.vehicle_id)}, {"$set": {
            "last_service_date": today_local().isoformat(), "next_service_date": wo.next_service_date,
            "last_km": wo.km, "reminder_sent_at": "",
        }})
    return sale


# ---------- Stock adjustment ----------
@router.post("/stock/adjust", response_model=StockMove)
async def adjust_stock(body: StockAdjustIn, user: dict = Depends(OWNER)):
    delta = body.qty if body.type == "in" else -body.qty
    f = {"_id": oid(body.item_id)}
    if body.type == "out":
        f["stock"] = {"$gte": body.qty}
    d = await db.items.find_one_and_update(f, {"$inc": {"stock": delta}}, return_document=ReturnDocument.AFTER)
    if not d:
        raise HTTPException(400, "Barang tidak ditemukan atau stok tidak cukup")
    await log_move(d, body.type, body.qty, "MANUAL", body.note.strip(), user["name"])
    return StockMove.from_mongo(await db.stock_moves.find_one({"item_id": str(d["_id"])}, sort=[("created_at", -1)]))


@router.get("/stock/moves", response_model=List[StockMove])
async def list_moves(start: str = "", end: str = "", q: str = "", _=Depends(OWNER)):
    f = {"created_at": local_range(start, end)}
    if q.strip():
        f["$or"] = [{"name": rx(q)}, {"code": rx(q)}, {"ref": rx(q)}]
    return [StockMove.from_mongo(d) for d in await db.stock_moves.find(f).sort("created_at", -1).to_list(5000)]
