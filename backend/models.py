from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from core import BaseDocument

Role = Literal["owner", "kasir"]
PayMethod = Literal["tunai", "qris", "debit", "kredit", "transfer"]
WOStatus = Literal["diterima", "dikerjakan", "selesai", "dibayar", "batal"]

DEFAULT_WA_TEMPLATE = (
    "Halo {nama}, kami dari {bengkel} mengingatkan bahwa kendaraan {kendaraan} ({plat}) "
    "dijadwalkan untuk service berikutnya pada {tanggal}. Silakan datang kembali agar kendaraan "
    "tetap prima. Terima kasih."
)


class User(BaseDocument):
    username: str
    name: str
    email: str = ""
    role: Role
    active: bool = True
    created_at: str = ""


class UserIn(BaseModel):
    username: str = Field(min_length=3)
    name: str = Field(min_length=1)
    email: str = ""
    role: Role
    active: bool = True
    password: str = ""


class LoginIn(BaseModel):
    username: str
    password: str


class SettingsIn(BaseModel):
    store_name: str = "[Nama Bengkel]"
    address: str = "[Alamat Bengkel]"
    phone: str = "[No. Telepon]"
    receipt_footer: str = "Terima kasih atas kepercayaan Anda"
    paper_width: Literal["58", "80"] = "58"
    qris_image: str = ""
    low_stock_threshold: float = Field(5, ge=0)
    high_stock_threshold: float = Field(50, ge=0)
    service_interval_days: int = Field(60, ge=1)
    reminder_days_ahead: int = Field(7, ge=0)
    country_code: str = "62"
    wa_template: str = DEFAULT_WA_TEMPLATE


class Settings(BaseDocument, SettingsIn):
    key: str = "store"


class ItemIn(BaseModel):
    code: str = ""
    name: str = Field(min_length=1)
    category: str = ""
    unit: str = "pcs"
    buy_price: float = Field(0, ge=0)
    sell_price: float = Field(0, ge=0)
    min_stock: float = Field(0, ge=0)
    stock: float = Field(0, ge=0)


class Item(BaseDocument):
    code: str
    name: str
    category: str = ""
    unit: str = "pcs"
    buy_price: float = 0
    sell_price: float = 0
    stock: float = 0
    min_stock: float = 0
    created_at: str = ""


class ServiceIn(BaseModel):
    name: str = Field(min_length=1)
    price: float = Field(0, ge=0)


class Service(BaseDocument, ServiceIn):
    created_at: str = ""


class SupplierIn(BaseModel):
    name: str = Field(min_length=1)
    phone: str = ""
    address: str = ""


class Supplier(BaseDocument, SupplierIn):
    created_at: str = ""


class CustomerIn(BaseModel):
    name: str = Field(min_length=1)
    phone: str = ""
    address: str = ""


class Customer(BaseDocument, CustomerIn):
    created_at: str = ""


class MechanicIn(BaseModel):
    name: str = Field(min_length=1)
    phone: str = ""
    active: bool = True


class Mechanic(BaseDocument, MechanicIn):
    created_at: str = ""


class VehicleIn(BaseModel):
    plate: str = Field(min_length=1)
    brand: str = ""
    model: str = ""
    year: str = ""
    color: str = ""
    customer_id: str = ""
    next_service_date: str = ""


class Vehicle(BaseDocument):
    plate: str
    plate_key: str
    brand: str = ""
    model: str = ""
    year: str = ""
    color: str = ""
    customer_id: str = ""
    customer_name: str = ""
    customer_phone: str = ""
    last_service_date: str = ""
    next_service_date: str = ""
    last_km: str = ""
    reminder_sent_at: str = ""
    created_at: str = ""


class LineIn(BaseModel):
    item_id: str
    qty: float = Field(gt=0)
    price: Optional[float] = Field(None, ge=0)


class Line(BaseModel):
    item_id: str
    code: str
    name: str
    unit: str = "pcs"
    qty: float
    price: float
    subtotal: float
    cost: float = 0
    added_by: str = ""
    added_at: str = ""


class ServiceLineIn(BaseModel):
    service_id: str
    price: Optional[float] = Field(None, ge=0)


class ServiceLine(BaseModel):
    service_id: str
    name: str
    price: float


class PaymentIn(BaseModel):
    method: PayMethod
    ref: str = ""
    paid_amount: float = Field(0, ge=0)
    discount: float = Field(0, ge=0)


class SaleIn(BaseModel):
    items: List[LineIn] = Field(min_length=1)
    customer_name: str = ""
    customer_phone: str = ""
    payment: PaymentIn


class Sale(BaseDocument):
    number: str
    type: Literal["part", "service"]
    work_order_id: str = ""
    work_order_number: str = ""
    customer_name: str = ""
    customer_phone: str = ""
    plate: str = ""
    vehicle_desc: str = ""
    km: str = ""
    mechanic_id: str = ""
    mechanic_name: str = ""
    items: List[Line] = []
    services: List[ServiceLine] = []
    parts_total: float = 0
    services_total: float = 0
    subtotal: float = 0
    discount: float = 0
    total: float = 0
    cost_total: float = 0
    payment_method: PayMethod
    payment_ref: str = ""
    paid_amount: float = 0
    change: float = 0
    cashier: str = ""
    cashier_id: str = ""
    next_service_date: str = ""
    created_at: str = ""


class CashCloseIn(BaseModel):
    opening_cash: float = Field(0, ge=0)
    counted_cash: float = Field(0, ge=0)
    note: str = ""


class CashClosing(BaseDocument):
    number: str
    user_id: str
    user_name: str
    period_start: str
    period_end: str
    count: int = 0
    part_count: int = 0
    service_count: int = 0
    total: float = 0
    parts_total: float = 0
    services_total: float = 0
    discount: float = 0
    by_method: Dict[str, float] = {}
    cash_sales: float = 0
    non_cash_sales: float = 0
    opening_cash: float = 0
    expected_cash: float = 0
    counted_cash: float = 0
    difference: float = 0
    note: str = ""
    created_at: str = ""


class PurchaseIn(BaseModel):
    supplier_id: str
    invoice_no: str = ""
    date: str
    items: List[LineIn] = Field(min_length=1)
    note: str = ""
    update_buy_price: bool = True


class Purchase(BaseDocument):
    number: str
    supplier_id: str
    supplier_name: str
    invoice_no: str = ""
    date: str
    items: List[Line]
    total: float
    note: str = ""
    created_by: str = ""
    created_at: str = ""


class WOCreate(BaseModel):
    plate: str = Field(min_length=1)
    brand: str = ""
    model: str = ""
    year: str = ""
    color: str = ""
    customer_name: str = Field(min_length=1)
    customer_phone: str = ""
    customer_address: str = ""
    km: str = ""
    complaint: str = ""
    mechanic_id: str = Field(min_length=1)
    parts: List[LineIn] = []
    services: List[ServiceLineIn] = []
    next_service_date: str = ""
    note: str = ""


class WOUpdate(BaseModel):
    km: str = ""
    complaint: str = ""
    mechanic_id: str = Field(min_length=1)
    parts: List[LineIn] = []
    services: List[ServiceLineIn] = []
    next_service_date: str = ""
    note: str = ""


class WOAddParts(BaseModel):
    parts: List[LineIn] = Field(min_length=1)


class WOStatusIn(BaseModel):
    status: Literal["diterima", "dikerjakan", "selesai", "batal"]


class WorkOrder(BaseDocument):
    number: str
    customer_id: str = ""
    customer_name: str = ""
    customer_phone: str = ""
    vehicle_id: str = ""
    plate: str
    plate_key: str
    vehicle_desc: str = ""
    km: str = ""
    complaint: str = ""
    mechanic_id: str = ""
    mechanic_name: str = ""
    parts: List[Line] = []
    services: List[ServiceLine] = []
    parts_total: float = 0
    services_total: float = 0
    estimate_total: float = 0
    status: WOStatus = "diterima"
    next_service_date: str = ""
    note: str = ""
    sale_id: str = ""
    sale_number: str = ""
    created_by: str = ""
    created_at: str = ""
    updated_at: str = ""
    paid_at: str = ""


class StockAdjustIn(BaseModel):
    item_id: str
    type: Literal["in", "out"]
    qty: float = Field(gt=0)
    note: str = ""


class StockMove(BaseDocument):
    item_id: str
    code: str
    name: str
    type: str
    qty: float
    stock_after: float = 0
    ref: str = ""
    note: str = ""
    user: str = ""
    created_at: str = ""
