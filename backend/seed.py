import os

from pymongo import ReturnDocument

from core import db, hash_password, now_iso, verify_password
from models import Item, Mechanic, Service, Settings, Supplier, User


async def ensure_indexes():
    await db.users.create_index("username", unique=True)
    await db.items.create_index("code", unique=True)
    await db.items.create_index("name")
    await db.vehicles.create_index("plate_key", unique=True)
    await db.sales.create_index("number", unique=True)
    await db.sales.create_index("created_at")
    await db.work_orders.create_index("number", unique=True)
    await db.work_orders.create_index([("plate_key", 1), ("status", 1)])
    await db.purchases.create_index("created_at")
    await db.stock_moves.create_index("created_at")
    await db.login_attempts.create_index("identifier")
    await db.customers.create_index("phone")
    await db.counters.create_index("key", unique=True)
    await db.cash_closings.create_index([("user_id", 1), ("created_at", -1)])
    await db.sales.create_index([("cashier_id", 1), ("created_at", 1)])


async def gen_item_code() -> str:
    while True:
        r = await db.counters.find_one_and_update(
            {"key": "item_code"}, {"$inc": {"seq": 1}}, upsert=True, return_document=ReturnDocument.AFTER
        )
        code = f"2{r['seq']:011d}"
        if not await db.items.find_one({"code": code}):
            return code


async def _ensure_user(username: str, password: str, name: str, role: str, email: str = "", sync: bool = False):
    existing = await db.users.find_one({"username": username})
    if existing is None:
        user = User(username=username, name=name, email=email, role=role, created_at=now_iso())
        await db.users.insert_one({**user.to_mongo(), "password_hash": hash_password(password)})
    elif sync and not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"_id": existing["_id"]}, {"$set": {"password_hash": hash_password(password)}})


async def seed_users():
    await _ensure_user(
        os.environ["ADMIN_USERNAME"].strip().lower(), os.environ["ADMIN_PASSWORD"], os.environ["ADMIN_NAME"],
        "owner", os.environ["ADMIN_EMAIL"].strip().lower(), os.environ["ADMIN_SYNC_PASSWORD"] == "true",
    )
    if os.environ.get("SEED_DEMO") == "true":
        await _ensure_user("kasir", os.environ["DEMO_KASIR_PASSWORD"], "Kasir Demo", "kasir")


async def seed_settings():
    if not await db.settings.find_one({"key": "store"}):
        await db.settings.insert_one(Settings().to_mongo())


DEMO_ITEMS = [
    ("Oli Mesin 10W-30 0.8L", "Oli", "botol", 38000, 48000, 40, 10),
    ("Oli Gardan 120ml", "Oli", "botol", 12000, 17000, 25, 5),
    ("Busi Standar", "Kelistrikan", "pcs", 15000, 22000, 30, 10),
    ("Kampas Rem Depan", "Rem", "set", 35000, 50000, 4, 5),
    ("Kampas Rem Belakang", "Rem", "set", 30000, 45000, 12, 5),
    ("Filter Udara", "Filter", "pcs", 35000, 55000, 3, 5),
    ("V-Belt", "CVT", "pcs", 75000, 110000, 8, 3),
    ("Ban Dalam Ring 17", "Ban", "pcs", 22000, 32000, 120, 10),
    ("Aki Kering 5Ah", "Kelistrikan", "pcs", 180000, 240000, 6, 2),
]
DEMO_SERVICES = [
    ("Service Ringan", 50000), ("Service Besar", 120000), ("Ganti Oli", 10000),
    ("Tune Up Injeksi", 75000), ("Bongkar CVT", 60000), ("Tambal Ban", 15000),
]


async def seed_demo():
    if os.environ.get("SEED_DEMO") != "true" or await db.items.count_documents({}) > 0:
        return
    for name, cat, unit, buy, sell, stock, min_stock in DEMO_ITEMS:
        item = Item(code=await gen_item_code(), name=name, category=cat, unit=unit, buy_price=buy,
                    sell_price=sell, stock=stock, min_stock=min_stock, created_at=now_iso())
        await db.items.insert_one(item.to_mongo())
    for name, price in DEMO_SERVICES:
        await db.services.insert_one(Service(name=name, price=price, created_at=now_iso()).to_mongo())
    for name in ("Mekanik A (Demo)", "Mekanik B (Demo)"):
        await db.mechanics.insert_one(Mechanic(name=name, created_at=now_iso()).to_mongo())
    await db.suppliers.insert_one(Supplier(name="Supplier Demo", created_at=now_iso()).to_mongo())


async def run_seed():
    await ensure_indexes()
    await seed_users()
    await seed_settings()
    await seed_demo()
