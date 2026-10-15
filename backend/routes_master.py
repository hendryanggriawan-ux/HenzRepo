from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pymongo import ReturnDocument

from core import OWNER, STAFF, db, norm_plate, now_iso, oid, plate_key, rx
from models import (
    Customer, CustomerIn, Item, ItemIn, Mechanic, MechanicIn, Service, ServiceIn, Settings, SettingsIn,
    Supplier, SupplierIn, Vehicle, VehicleIn,
)
from seed import gen_item_code
from stock import log_move

router = APIRouter()


def crud(path, coll, Model, InModel, search=("name",), create_dep=OWNER, on_update=None):
    r = APIRouter(prefix=f"/{path}", tags=[path])

    @r.get("", response_model=List[Model])
    async def list_docs(q: str = "", _=Depends(STAFF)):
        f = {"$or": [{k: rx(q)} for k in search]} if q.strip() else {}
        return [Model.from_mongo(d) for d in await db[coll].find(f).sort("name", 1).to_list(5000)]

    @r.post("", response_model=Model)
    async def create_doc(body: InModel, _=Depends(create_dep)):
        m = Model(**body.model_dump(), created_at=now_iso())
        res = await db[coll].insert_one(m.to_mongo())
        m.id = str(res.inserted_id)
        return m

    @r.put("/{doc_id}", response_model=Model)
    async def update_doc(doc_id: str, body: InModel, _=Depends(OWNER)):
        doc = await db[coll].find_one_and_update(
            {"_id": oid(doc_id)}, {"$set": body.model_dump()}, return_document=ReturnDocument.AFTER
        )
        if not doc:
            raise HTTPException(404, "Data tidak ditemukan")
        if on_update:
            await on_update(doc)
        return Model.from_mongo(doc)

    @r.delete("/{doc_id}")
    async def delete_doc(doc_id: str, _=Depends(OWNER)):
        res = await db[coll].delete_one({"_id": oid(doc_id)})
        if not res.deleted_count:
            raise HTTPException(404, "Data tidak ditemukan")
        return {"ok": True}

    return r


async def _sync_customer(doc):
    await db.vehicles.update_many(
        {"customer_id": str(doc["_id"])}, {"$set": {"customer_name": doc["name"], "customer_phone": doc["phone"]}}
    )


router.include_router(crud("services", "services", Service, ServiceIn))
router.include_router(crud("suppliers", "suppliers", Supplier, SupplierIn, ("name", "phone")))
router.include_router(crud("mechanics", "mechanics", Mechanic, MechanicIn, ("name", "phone")))
router.include_router(crud("customers", "customers", Customer, CustomerIn, ("name", "phone"), STAFF, _sync_customer))


# ---------- Items ----------
@router.get("/items", response_model=List[Item])
async def list_items(q: str = "", limit: int = 0, _=Depends(STAFF)):
    f = {"$or": [{"name": rx(q)}, {"code": rx(q)}, {"category": rx(q)}]} if q.strip() else {}
    cur = db.items.find(f).sort("name", 1)
    if limit:
        cur = cur.limit(limit)
    return [Item.from_mongo(d) for d in await cur.to_list(5000)]


@router.get("/items/code/{code}", response_model=Item)
async def item_by_code(code: str, _=Depends(STAFF)):
    d = await db.items.find_one({"code": code.strip()})
    if not d:
        raise HTTPException(404, "Barang tidak ditemukan")
    return Item.from_mongo(d)


@router.post("/items", response_model=Item)
async def create_item(body: ItemIn, user: dict = Depends(OWNER)):
    code = body.code.strip() or await gen_item_code()
    if await db.items.find_one({"code": code}):
        raise HTTPException(400, "Kode/barcode sudah dipakai barang lain")
    item = Item(**body.model_dump(exclude={"code"}), code=code, created_at=now_iso())
    res = await db.items.insert_one(item.to_mongo())
    item.id = str(res.inserted_id)
    if item.stock > 0:
        await log_move({**item.to_mongo(), "_id": res.inserted_id}, "in", item.stock, "", "Stok awal", user["name"])
    return item


@router.put("/items/{item_id}", response_model=Item)
async def update_item(item_id: str, body: ItemIn, _=Depends(OWNER)):
    data = body.model_dump(exclude={"stock"})
    data["code"] = body.code.strip()
    if not data["code"]:
        data.pop("code")
    elif await db.items.find_one({"code": data["code"], "_id": {"$ne": oid(item_id)}}):
        raise HTTPException(400, "Kode/barcode sudah dipakai barang lain")
    doc = await db.items.find_one_and_update({"_id": oid(item_id)}, {"$set": data}, return_document=ReturnDocument.AFTER)
    if not doc:
        raise HTTPException(404, "Barang tidak ditemukan")
    return Item.from_mongo(doc)


@router.delete("/items/{item_id}")
async def delete_item(item_id: str, _=Depends(OWNER)):
    res = await db.items.delete_one({"_id": oid(item_id)})
    if not res.deleted_count:
        raise HTTPException(404, "Barang tidak ditemukan")
    return {"ok": True}


# ---------- Vehicles ----------
async def _vehicle_data(body: VehicleIn) -> dict:
    plate = norm_plate(body.plate)
    data = {**body.model_dump(), "plate": plate, "plate_key": plate_key(plate), "customer_name": "", "customer_phone": ""}
    if body.customer_id:
        c = await db.customers.find_one({"_id": oid(body.customer_id)})
        if not c:
            raise HTTPException(404, "Pelanggan tidak ditemukan")
        data.update(customer_name=c["name"], customer_phone=c.get("phone", ""))
    return data


@router.get("/vehicles", response_model=List[Vehicle])
async def list_vehicles(q: str = "", _=Depends(STAFF)):
    f = {"$or": [{"plate_key": rx(plate_key(q) or q)}, {"customer_name": rx(q)}, {"model": rx(q)}]} if q.strip() else {}
    return [Vehicle.from_mongo(d) for d in await db.vehicles.find(f).sort("plate_key", 1).to_list(5000)]


@router.get("/vehicles/plate/{plate}")
async def vehicle_by_plate(plate: str, _=Depends(STAFF)):
    v = await db.vehicles.find_one({"plate_key": plate_key(plate)})
    if not v:
        raise HTTPException(404, "Kendaraan belum terdaftar")
    c = await db.customers.find_one({"_id": oid(v["customer_id"])}) if v.get("customer_id") else None
    return {"vehicle": Vehicle.from_mongo(v), "customer": Customer.from_mongo(c)}


@router.post("/vehicles", response_model=Vehicle)
async def create_vehicle(body: VehicleIn, _=Depends(STAFF)):
    data = await _vehicle_data(body)
    if await db.vehicles.find_one({"plate_key": data["plate_key"]}):
        raise HTTPException(400, "Nomor polisi sudah terdaftar")
    v = Vehicle(**data, created_at=now_iso())
    res = await db.vehicles.insert_one(v.to_mongo())
    v.id = str(res.inserted_id)
    return v


@router.put("/vehicles/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(vehicle_id: str, body: VehicleIn, _=Depends(OWNER)):
    data = await _vehicle_data(body)
    if await db.vehicles.find_one({"plate_key": data["plate_key"], "_id": {"$ne": oid(vehicle_id)}}):
        raise HTTPException(400, "Nomor polisi sudah terdaftar")
    doc = await db.vehicles.find_one_and_update({"_id": oid(vehicle_id)}, {"$set": data}, return_document=ReturnDocument.AFTER)
    if not doc:
        raise HTTPException(404, "Kendaraan tidak ditemukan")
    return Vehicle.from_mongo(doc)


@router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, _=Depends(OWNER)):
    res = await db.vehicles.delete_one({"_id": oid(vehicle_id)})
    if not res.deleted_count:
        raise HTTPException(404, "Kendaraan tidak ditemukan")
    return {"ok": True}


# ---------- Settings ----------
async def get_settings() -> Settings:
    return Settings.from_mongo(await db.settings.find_one({"key": "store"})) or Settings()


@router.get("/settings/public")
async def public_settings():
    s = await get_settings()
    return {"store_name": s.store_name}


@router.get("/settings", response_model=Settings)
async def read_settings(_=Depends(STAFF)):
    return await get_settings()


@router.put("/settings", response_model=Settings)
async def save_settings(body: SettingsIn, _=Depends(OWNER)):
    if len(body.qris_image) > 2_000_000:
        raise HTTPException(400, "Ukuran gambar QRIS terlalu besar (maks ~1.5MB)")
    doc = await db.settings.find_one_and_update(
        {"key": "store"}, {"$set": body.model_dump()}, upsert=True, return_document=ReturnDocument.AFTER
    )
    return Settings.from_mongo(doc)
