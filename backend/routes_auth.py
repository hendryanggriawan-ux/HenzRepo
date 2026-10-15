from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from pymongo import ReturnDocument

from core import OWNER, STAFF, create_token, db, hash_password, now_iso, oid, verify_password
from models import LoginIn, User, UserIn

router = APIRouter()
MAX_ATTEMPTS = 5
LOCK_MINUTES = 15


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown")


@router.post("/auth/login")
async def login(body: LoginIn, request: Request):
    username = body.username.strip().lower()
    ident = f"{_client_ip(request)}:{username}"
    now = datetime.now(timezone.utc)
    att = await db.login_attempts.find_one({"identifier": ident})
    locked_until = datetime.fromisoformat(att["locked_until"]) if att and att.get("locked_until") else None
    if locked_until and locked_until > now:
        raise HTTPException(429, "Terlalu banyak percobaan login. Coba lagi dalam 15 menit.")
    user = await db.users.find_one({"$or": [{"username": username}, {"email": username}]})
    if not user or not user.get("active", True) or not verify_password(body.password, user["password_hash"]):
        count = 1 if (not att or locked_until) else att.get("count", 0) + 1
        update = {"count": count, "locked_until": ""}
        if count >= MAX_ATTEMPTS:
            update["locked_until"] = (now + timedelta(minutes=LOCK_MINUTES)).isoformat()
        await db.login_attempts.update_one({"identifier": ident}, {"$set": update}, upsert=True)
        raise HTTPException(401, "Username atau password salah")
    await db.login_attempts.delete_one({"identifier": ident})
    return {"token": create_token(str(user["_id"]), user["role"]), "user": User.from_mongo(user)}


@router.get("/auth/me", response_model=User)
async def me(user: dict = Depends(STAFF)):
    return User.from_mongo(user)


@router.get("/users", response_model=List[User])
async def list_users(_=Depends(OWNER)):
    return [User.from_mongo(d) for d in await db.users.find({}, {"password_hash": 0}).sort("username", 1).to_list(500)]


@router.post("/users", response_model=User)
async def create_user(body: UserIn, _=Depends(OWNER)):
    username = body.username.strip().lower()
    if len(body.password) < 6:
        raise HTTPException(400, "Password minimal 6 karakter")
    if await db.users.find_one({"username": username}):
        raise HTTPException(400, "Username sudah dipakai")
    user = User(username=username, name=body.name.strip(), email=body.email.strip().lower(), role=body.role,
                active=body.active, created_at=now_iso())
    res = await db.users.insert_one({**user.to_mongo(), "password_hash": hash_password(body.password)})
    user.id = str(res.inserted_id)
    return user


@router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, body: UserIn, current: dict = Depends(OWNER)):
    username = body.username.strip().lower()
    if user_id == current["id"] and (body.role != "owner" or not body.active):
        raise HTTPException(400, "Tidak dapat menurunkan role / menonaktifkan akun sendiri")
    if await db.users.find_one({"username": username, "_id": {"$ne": oid(user_id)}}):
        raise HTTPException(400, "Username sudah dipakai")
    update = {"username": username, "name": body.name.strip(), "email": body.email.strip().lower(),
              "role": body.role, "active": body.active}
    if body.password:
        if len(body.password) < 6:
            raise HTTPException(400, "Password minimal 6 karakter")
        update["password_hash"] = hash_password(body.password)
    doc = await db.users.find_one_and_update(
        {"_id": oid(user_id)}, {"$set": update}, projection={"password_hash": 0}, return_document=ReturnDocument.AFTER
    )
    if not doc:
        raise HTTPException(404, "Pengguna tidak ditemukan")
    return User.from_mongo(doc)


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current: dict = Depends(OWNER)):
    if user_id == current["id"]:
        raise HTTPException(400, "Tidak dapat menghapus akun sendiri")
    res = await db.users.delete_one({"_id": oid(user_id)})
    if not res.deleted_count:
        raise HTTPException(404, "Pengguna tidak ditemukan")
    return {"ok": True}
