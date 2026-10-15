from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException

from core import OWNER, STAFF, db, local_date_of, local_range, now_iso, oid, today_local
from models import Item, Purchase, Sale, Vehicle
from routes_master import get_settings

router = APIRouter(prefix="/reports")
reminders = APIRouter(prefix="/reminders")
ACTIVE = ["diterima", "dikerjakan", "selesai"]


def _low_filter(threshold: float) -> dict:
    return {"$expr": {"$lte": ["$stock", {"$cond": [{"$gt": ["$min_stock", 0]}, "$min_stock", threshold]}]}}


def _sales_summary(sales):
    by_method = {}
    for s in sales:
        by_method[s.payment_method] = round(by_method.get(s.payment_method, 0) + s.total, 2)
    parts = round(sum(s.parts_total for s in sales), 2)
    services = round(sum(s.services_total for s in sales), 2)
    discount = round(sum(s.discount for s in sales), 2)
    cost = round(sum(s.cost_total for s in sales), 2)
    return {
        "count": len(sales), "total": round(sum(s.total for s in sales), 2), "parts_total": parts,
        "services_total": services, "discount": discount, "cost_total": cost,
        "gross_profit": round(parts - cost + services - discount, 2), "by_method": by_method,
        "part_count": sum(1 for s in sales if s.type == "part"),
        "service_count": sum(1 for s in sales if s.type == "service"),
    }


@router.get("/dashboard")
async def dashboard(_=Depends(OWNER)):
    settings = await get_settings()
    today = today_local()
    week_start = (today - timedelta(days=6)).isoformat()
    week = [Sale.from_mongo(d) for d in await db.sales.find({"created_at": local_range(week_start, today.isoformat())}).to_list(10000)]
    series = {(today - timedelta(days=i)).isoformat(): 0 for i in range(6, -1, -1)}
    for s in week:
        day = local_date_of(s.created_at)
        if day in series:
            series[day] += s.total
    today_sales = [s for s in week if local_date_of(s.created_at) == today.isoformat()]
    low = await db.items.find(_low_filter(settings.low_stock_threshold)).sort("stock", 1).to_list(1000)
    due_limit = (today + timedelta(days=settings.reminder_days_ahead)).isoformat()
    recent = await db.sales.find({}).sort("created_at", -1).limit(8).to_list(8)
    return {
        "today": _sales_summary(today_sales),
        "active_work_orders": await db.work_orders.count_documents({"status": {"$in": ACTIVE}}),
        "low_stock_count": len(low),
        "low_stock": [Item.from_mongo(d) for d in low[:6]],
        "due_reminders": await db.vehicles.count_documents({"next_service_date": {"$ne": "", "$lte": due_limit}}),
        "series": [{"date": k, "total": round(v, 2)} for k, v in series.items()],
        "recent_sales": [Sale.from_mongo(d) for d in recent],
    }


@router.get("/sales")
async def sales_report(start: str = "", end: str = "", type: str = "", _=Depends(OWNER)):
    f = {"created_at": local_range(start, end)}
    if type in ("part", "service"):
        f["type"] = type
    sales = [Sale.from_mongo(d) for d in await db.sales.find(f).sort("created_at", -1).to_list(10000)]
    return {"summary": _sales_summary(sales), "rows": sales}


@router.get("/purchases")
async def purchases_report(start: str = "", end: str = "", _=Depends(OWNER)):
    rows = [Purchase.from_mongo(d) for d in await db.purchases.find({"created_at": local_range(start, end)}).sort("created_at", -1).to_list(10000)]
    by_supplier = {}
    for p in rows:
        by_supplier[p.supplier_name] = round(by_supplier.get(p.supplier_name, 0) + p.total, 2)
    return {
        "summary": {"count": len(rows), "total": round(sum(p.total for p in rows), 2),
                    "items_qty": sum(x.qty for p in rows for x in p.items), "by_supplier": by_supplier},
        "rows": rows,
    }


@router.get("/stock")
async def stock_report(mode: str = "all", _=Depends(OWNER)):
    settings = await get_settings()
    if mode == "low":
        f = _low_filter(settings.low_stock_threshold)
    elif mode == "high":
        f = {"stock": {"$gte": settings.high_stock_threshold}}
    else:
        f = {}
    items = [Item.from_mongo(d) for d in await db.items.find(f).sort("stock", 1 if mode == "low" else -1).to_list(10000)]
    return {
        "mode": mode, "low_threshold": settings.low_stock_threshold, "high_threshold": settings.high_stock_threshold,
        "summary": {"count": len(items), "qty": sum(i.stock for i in items),
                    "value": round(sum(i.stock * i.buy_price for i in items), 2),
                    "sell_value": round(sum(i.stock * i.sell_price for i in items), 2)},
        "rows": items,
    }


@router.get("/mechanics")
async def mechanics_report(start: str = "", end: str = "", _=Depends(OWNER)):
    sales = [Sale.from_mongo(d) for d in await db.sales.find({"type": "service", "created_at": local_range(start, end)}).sort("created_at", -1).to_list(10000)]
    mechanics = await db.mechanics.find({}).sort("name", 1).to_list(500)
    summary = {str(m["_id"]): {"mechanic_id": str(m["_id"]), "mechanic_name": m["name"], "jobs": 0,
                                "services_total": 0, "parts_total": 0, "total": 0} for m in mechanics}
    for s in sales:
        row = summary.setdefault(s.mechanic_id, {"mechanic_id": s.mechanic_id, "mechanic_name": s.mechanic_name,
                                                 "jobs": 0, "services_total": 0, "parts_total": 0, "total": 0})
        row["jobs"] += 1
        row["services_total"] = round(row["services_total"] + s.services_total, 2)
        row["parts_total"] = round(row["parts_total"] + s.parts_total, 2)
        row["total"] = round(row["total"] + s.total, 2)
    active = {}
    async for w in db.work_orders.find({"status": {"$in": ACTIVE}}, {"mechanic_id": 1}):
        active[w["mechanic_id"]] = active.get(w["mechanic_id"], 0) + 1
    for k, row in summary.items():
        row["active_jobs"] = active.get(k, 0)
    jobs = [{"id": s.id, "number": s.number, "work_order_number": s.work_order_number, "created_at": s.created_at,
             "plate": s.plate, "vehicle_desc": s.vehicle_desc, "customer_name": s.customer_name,
             "mechanic_name": s.mechanic_name, "services": [x.name for x in s.services],
             "services_total": s.services_total, "parts_total": s.parts_total, "total": s.total} for s in sales]
    return {"summary": sorted(summary.values(), key=lambda r: -r["services_total"]), "jobs": jobs}


@reminders.get("")
async def list_reminders(days: int = -1, _=Depends(STAFF)):
    settings = await get_settings()
    ahead = settings.reminder_days_ahead if days < 0 else days
    limit = (today_local() + timedelta(days=ahead)).isoformat()
    docs = await db.vehicles.find({"next_service_date": {"$ne": "", "$lte": limit}}).sort("next_service_date", 1).to_list(5000)
    return [Vehicle.from_mongo(d) for d in docs]


@reminders.post("/{vehicle_id}/sent", response_model=Vehicle)
async def mark_sent(vehicle_id: str, _=Depends(STAFF)):
    from pymongo import ReturnDocument
    doc = await db.vehicles.find_one_and_update(
        {"_id": oid(vehicle_id)}, {"$set": {"reminder_sent_at": now_iso()}}, return_document=ReturnDocument.AFTER
    )
    if not doc:
        raise HTTPException(404, "Kendaraan tidak ditemukan")
    return Vehicle.from_mongo(doc)
