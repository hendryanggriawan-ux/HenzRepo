from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

import logging  # noqa: E402
import os  # noqa: E402

from fastapi import APIRouter, FastAPI  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402

import routes_auth  # noqa: E402
import routes_cash  # noqa: E402
import routes_export  # noqa: E402
import routes_import  # noqa: E402
import routes_master  # noqa: E402
import routes_reports  # noqa: E402
import routes_trx  # noqa: E402
from core import client  # noqa: E402
from seed import run_seed  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

app = FastAPI(title="POS Bengkel API")
api = APIRouter(prefix="/api")


@api.get("/")
async def health():
    return {"status": "ok", "app": "POS Bengkel"}


api.include_router(routes_auth.router)
api.include_router(routes_master.router)
api.include_router(routes_trx.router)
api.include_router(routes_reports.router)
api.include_router(routes_reports.reminders)
api.include_router(routes_cash.router)
api.include_router(routes_export.router)
api.include_router(routes_import.router)
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ["CORS_ORIGINS"].split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await run_seed()


@app.on_event("shutdown")
async def shutdown():
    client.close()
