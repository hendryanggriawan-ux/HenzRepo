import os
import re
from datetime import date, datetime, time, timedelta, timezone
from typing import Annotated, Optional
from zoneinfo import ZoneInfo

import bcrypt
import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import AliasChoices, BaseModel, BeforeValidator, ConfigDict, Field
from pymongo import ReturnDocument

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
TZ = ZoneInfo(os.environ["APP_TIMEZONE"])
JWT_SECRET = os.environ["JWT_SECRET"]
TOKEN_HOURS = int(os.environ["TOKEN_EXPIRE_HOURS"])
JWT_ALGORITHM = "HS256"

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    id: Optional[PyObjectId] = Field(
        default=None, validation_alias=AliasChoices("_id", "id"), serialization_alias="id"
    )

    @classmethod
    def from_mongo(cls, doc):
        return cls.model_validate(doc) if doc else None

    def to_mongo(self) -> dict:
        data = self.model_dump(exclude={"id"})
        if self.id:
            data["_id"] = ObjectId(self.id)
        return data


def oid(value: str) -> ObjectId:
    if not value or not ObjectId.is_valid(value):
        raise HTTPException(404, "Data tidak ditemukan")
    return ObjectId(value)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat(timespec="microseconds")


def now_iso() -> str:
    return iso(datetime.now(timezone.utc))


def today_local() -> date:
    return datetime.now(TZ).date()


def local_range(start: Optional[str], end: Optional[str]) -> dict:
    try:
        s = date.fromisoformat(start) if start else today_local()
        e = date.fromisoformat(end) if end else s
    except ValueError:
        raise HTTPException(400, "Format tanggal harus YYYY-MM-DD")
    return {
        "$gte": iso(datetime.combine(s, time.min, TZ)),
        "$lt": iso(datetime.combine(e + timedelta(days=1), time.min, TZ)),
    }


def local_date_of(iso_str: str) -> str:
    return datetime.fromisoformat(iso_str).astimezone(TZ).date().isoformat()


def rx(q: str) -> dict:
    return {"$regex": re.escape(q.strip()), "$options": "i"}


def norm_plate(p: str) -> str:
    return re.sub(r"\s+", " ", p.strip().upper())


def plate_key(p: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", p.upper())


async def next_number(prefix: str) -> str:
    key = f"{prefix}-{today_local().strftime('%Y%m%d')}"
    r = await db.counters.find_one_and_update(
        {"key": key}, {"$inc": {"seq": 1}}, upsert=True, return_document=ReturnDocument.AFTER
    )
    return f"{key}-{r['seq']:04d}"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Belum login")
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Sesi berakhir, silakan login ulang")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token tidak valid")
    if payload.get("type") != "access" or not ObjectId.is_valid(payload.get("sub", "")):
        raise HTTPException(401, "Token tidak valid")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])}, {"password_hash": 0})
    if not user or not user.get("active", True):
        raise HTTPException(401, "Akun tidak aktif")
    user["id"] = str(user.pop("_id"))
    return user


def require_roles(*roles: str):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(403, "Akses ditolak untuk role ini")
        return user

    return dep


OWNER = require_roles("owner")
STAFF = require_roles("owner", "kasir")
