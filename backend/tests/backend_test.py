"""POS Bengkel backend regression tests."""
import time
import uuid
import requests


# ---------- Auth ----------
def test_login_owner_username(base_url):
    r = requests.post(f"{base_url}/api/auth/login", json={"username": "owner", "password": "Bengkel#2026"})
    assert r.status_code == 200
    data = r.json()
    assert "token" in data and data["user"]["role"] == "owner"


def test_login_owner_by_email(base_url):
    r = requests.post(f"{base_url}/api/auth/login", json={"username": "hendryanggriawan@gmail.com", "password": "Bengkel#2026"})
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "owner"


def test_login_kasir(base_url):
    r = requests.post(f"{base_url}/api/auth/login", json={"username": "kasir", "password": "kasir123"})
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "kasir"


def test_login_wrong_password(base_url):
    r = requests.post(f"{base_url}/api/auth/login", json={"username": "owner", "password": "WRONG"})
    assert r.status_code == 401


def test_login_lockout_throwaway(base_url):
    tag = f"TEST_lock_{uuid.uuid4().hex[:6]}"
    last = None
    for _ in range(6):
        last = requests.post(f"{base_url}/api/auth/login", json={"username": tag, "password": "x"})
    assert last.status_code == 429


def test_me_requires_token(base_url):
    r = requests.get(f"{base_url}/api/auth/me")
    assert r.status_code == 401


# ---------- Role access ----------
def test_kasir_cannot_access_reports(kasir_client, base_url):
    for path in ["/api/reports/dashboard", "/api/reports/sales", "/api/reports/purchases",
                 "/api/reports/stock", "/api/reports/mechanics"]:
        r = kasir_client.get(f"{base_url}{path}")
        assert r.status_code == 403, f"{path} expected 403, got {r.status_code}"


def test_kasir_cannot_put_settings(kasir_client, base_url):
    r = kasir_client.put(f"{base_url}/api/settings", json={"store_name": "x"})
    assert r.status_code == 403


def test_kasir_cannot_create_item(kasir_client, base_url):
    r = kasir_client.post(f"{base_url}/api/items", json={"name": "TEST_x"})
    assert r.status_code == 403


def test_kasir_cannot_list_users(kasir_client, base_url):
    r = kasir_client.get(f"{base_url}/api/users")
    assert r.status_code == 403


# ---------- Items ----------
def test_items_list_and_seed(owner_client, base_url):
    r = owner_client.get(f"{base_url}/api/items")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 9
    codes = {i["code"] for i in items}
    assert "200000000001" in codes


def test_item_by_code(owner_client, base_url):
    r = owner_client.get(f"{base_url}/api/items/code/200000000001")
    assert r.status_code == 200
    assert "Oli" in r.json()["name"]


def test_item_create_auto_barcode_and_duplicate(owner_client, base_url):
    name = f"TEST_item_{uuid.uuid4().hex[:6]}"
    r = owner_client.post(f"{base_url}/api/items", json={"name": name, "sell_price": 1000, "buy_price": 500, "stock": 2})
    assert r.status_code == 200
    item = r.json()
    code = item["code"]
    assert len(code) == 12 and code.startswith("2")
    # duplicate code
    r2 = owner_client.post(f"{base_url}/api/items", json={"name": name + "_dup", "code": code})
    assert r2.status_code == 400
    # cleanup
    owner_client.delete(f"{base_url}/api/items/{item['id']}")


# ---------- Settings ----------
def test_settings_get_and_update(owner_client, base_url):
    r = owner_client.get(f"{base_url}/api/settings")
    assert r.status_code == 200
    s = r.json()
    original_name = s["store_name"]
    new_name = f"TEST_Bengkel_{uuid.uuid4().hex[:4]}"
    s["store_name"] = new_name
    r2 = owner_client.put(f"{base_url}/api/settings", json=s)
    assert r2.status_code == 200
    assert r2.json()["store_name"] == new_name
    # public endpoint
    r3 = requests.get(f"{base_url}/api/settings/public")
    assert r3.status_code == 200
    assert r3.json()["store_name"] == new_name
    # restore
    s["store_name"] = original_name
    owner_client.put(f"{base_url}/api/settings", json=s)


# ---------- Sales (part only) ----------
def _get_item(owner_client, base_url, code):
    return owner_client.get(f"{base_url}/api/items/code/{code}").json()


def test_create_part_sale_and_stock_decrease(kasir_client, owner_client, base_url):
    item = _get_item(owner_client, base_url, "200000000001")
    before = item["stock"]
    payload = {
        "items": [{"item_id": item["id"], "qty": 1}],
        "customer_name": "TEST_Walkin",
        "payment": {"method": "tunai", "paid_amount": item["sell_price"] + 2000, "discount": 0},
    }
    r = kasir_client.post(f"{base_url}/api/sales", json=payload)
    assert r.status_code == 200, r.text
    sale = r.json()
    assert sale["change"] == 2000
    assert sale["total"] == item["sell_price"]
    # GET verifies persistence
    r2 = owner_client.get(f"{base_url}/api/sales/{sale['id']}")
    assert r2.status_code == 200
    # stock decreased
    after = _get_item(owner_client, base_url, "200000000001")["stock"]
    assert after == before - 1


def test_sale_insufficient_cash(kasir_client, owner_client, base_url):
    item = _get_item(owner_client, base_url, "200000000001")
    payload = {
        "items": [{"item_id": item["id"], "qty": 1}],
        "payment": {"method": "tunai", "paid_amount": 1, "discount": 0},
    }
    r = kasir_client.post(f"{base_url}/api/sales", json=payload)
    assert r.status_code == 400


def test_sale_over_stock(kasir_client, owner_client, base_url):
    item = _get_item(owner_client, base_url, "200000000006")  # low stock
    payload = {
        "items": [{"item_id": item["id"], "qty": item["stock"] + 999}],
        "payment": {"method": "qris", "ref": "TEST", "paid_amount": 0, "discount": 0},
    }
    r = kasir_client.post(f"{base_url}/api/sales", json=payload)
    assert r.status_code == 400


# ---------- Work orders ----------
def _get_mechanic(owner_client, base_url):
    r = owner_client.get(f"{base_url}/api/mechanics")
    return r.json()[0]


def test_wo_create_duplicate_active_rejected(kasir_client, owner_client, base_url):
    mech = _get_mechanic(owner_client, base_url)
    item = _get_item(owner_client, base_url, "200000000002")
    service = owner_client.get(f"{base_url}/api/services").json()[0]
    plate = f"TEST {uuid.uuid4().hex[:4].upper()} AB"
    body = {
        "plate": plate, "brand": "Honda", "model": "Vario", "year": "2020",
        "customer_name": "TEST_Owner", "customer_phone": "081234567890",
        "mechanic_id": mech["id"],
        "parts": [{"item_id": item["id"], "qty": 1}],
        "services": [{"service_id": service["id"]}],
        "next_service_date": "2026-06-01",
    }
    r = kasir_client.post(f"{base_url}/api/work-orders", json=body)
    assert r.status_code == 200, r.text
    wo = r.json()
    assert wo["estimate_total"] == item["sell_price"] + service["price"]
    # duplicate
    r2 = kasir_client.post(f"{base_url}/api/work-orders", json=body)
    assert r2.status_code == 400
    # kasir cannot PUT WO
    r3 = kasir_client.put(f"{base_url}/api/work-orders/{wo['id']}", json={
        "mechanic_id": mech["id"], "parts": [], "services": []
    })
    assert r3.status_code == 403
    # kasir can add parts
    r4 = kasir_client.post(f"{base_url}/api/work-orders/{wo['id']}/parts",
                           json={"parts": [{"item_id": item["id"], "qty": 1}]})
    assert r4.status_code == 200
    # kasir cannot cancel (status batal)
    r5 = kasir_client.patch(f"{base_url}/api/work-orders/{wo['id']}/status", json={"status": "batal"})
    assert r5.status_code == 403
    # owner can cancel
    r6 = owner_client.patch(f"{base_url}/api/work-orders/{wo['id']}/status", json={"status": "batal"})
    assert r6.status_code == 200
    # cannot edit cancelled
    r7 = owner_client.put(f"{base_url}/api/work-orders/{wo['id']}", json={
        "mechanic_id": mech["id"], "parts": [], "services": []
    })
    assert r7.status_code == 400


def test_wo_pay_updates_vehicle_and_stock(kasir_client, owner_client, base_url):
    mech = _get_mechanic(owner_client, base_url)
    item = _get_item(owner_client, base_url, "200000000003")
    before_stock = item["stock"]
    service = owner_client.get(f"{base_url}/api/services").json()[0]
    plate = f"TEST {uuid.uuid4().hex[:4].upper()} CD"
    body = {
        "plate": plate, "brand": "Yamaha", "model": "NMAX", "customer_name": "TEST_Pay",
        "customer_phone": "081200000000", "mechanic_id": mech["id"],
        "parts": [{"item_id": item["id"], "qty": 1}],
        "services": [{"service_id": service["id"]}],
        "next_service_date": "2026-07-01",
    }
    wo = kasir_client.post(f"{base_url}/api/work-orders", json=body).json()
    r = kasir_client.post(f"{base_url}/api/work-orders/{wo['id']}/pay",
                          json={"method": "qris", "ref": "TEST_REF", "paid_amount": 0, "discount": 0})
    assert r.status_code == 200, r.text
    sale = r.json()
    assert sale["type"] == "service"
    assert sale["payment_method"] == "qris"
    # vehicle next_service_date saved
    v = owner_client.get(f"{base_url}/api/vehicles/plate/{plate}").json()
    assert v["vehicle"]["next_service_date"] == "2026-07-01"
    # stock decreased
    after = _get_item(owner_client, base_url, "200000000003")["stock"]
    assert after == before_stock - 1


# ---------- Purchase ----------
def test_purchase_increases_stock(owner_client, base_url):
    sup = owner_client.get(f"{base_url}/api/suppliers").json()[0]
    item = _get_item(owner_client, base_url, "200000000006")
    before = item["stock"]
    body = {
        "supplier_id": sup["id"], "invoice_no": f"TEST_INV_{uuid.uuid4().hex[:4]}",
        "date": "2026-01-10",
        "items": [{"item_id": item["id"], "qty": 5, "price": 36000}],
        "update_buy_price": True,
    }
    r = owner_client.post(f"{base_url}/api/purchases", json=body)
    assert r.status_code == 200, r.text
    after = _get_item(owner_client, base_url, "200000000006")
    assert after["stock"] == before + 5
    assert after["buy_price"] == 36000


# ---------- Reports ----------
def test_dashboard_report(owner_client, base_url):
    r = owner_client.get(f"{base_url}/api/reports/dashboard")
    assert r.status_code == 200
    data = r.json()
    for k in ("today", "active_work_orders", "low_stock_count", "series", "recent_sales"):
        assert k in data
    assert len(data["series"]) == 7


def test_sales_report(owner_client, base_url):
    r = owner_client.get(f"{base_url}/api/reports/sales?start=2026-01-01&end=2026-12-31")
    assert r.status_code == 200
    assert "summary" in r.json() and "by_method" in r.json()["summary"]


def test_stock_report_modes(owner_client, base_url):
    for m in ("all", "low", "high"):
        r = owner_client.get(f"{base_url}/api/reports/stock?mode={m}")
        assert r.status_code == 200
        assert r.json()["mode"] == m


def test_mechanics_report(owner_client, base_url):
    r = owner_client.get(f"{base_url}/api/reports/mechanics")
    assert r.status_code == 200
    assert "summary" in r.json() and "jobs" in r.json()


def test_stock_moves(owner_client, base_url):
    r = owner_client.get(f"{base_url}/api/reports/../stock/moves" )
    # fallback for route path
    assert r.status_code in (200, 404)
    r2 = owner_client.get(f"{base_url}/api/stock/moves")
    assert r2.status_code == 200


# ---------- Reminders ----------
def test_reminders_list(kasir_client, base_url):
    r = kasir_client.get(f"{base_url}/api/reminders?days=365")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- Users CRUD ----------
def test_user_create_and_delete(owner_client, base_url):
    uname = f"test_user_{uuid.uuid4().hex[:5]}"
    r = owner_client.post(f"{base_url}/api/users", json={
        "username": uname, "name": "TEST User", "role": "kasir", "password": "test123"
    })
    assert r.status_code == 200, r.text
    uid = r.json()["id"]
    # duplicate
    r2 = owner_client.post(f"{base_url}/api/users", json={
        "username": uname, "name": "x", "role": "kasir", "password": "test123"
    })
    assert r2.status_code == 400
    # delete
    r3 = owner_client.delete(f"{base_url}/api/users/{uid}")
    assert r3.status_code == 200


def test_owner_cannot_delete_self(owner_client, base_url):
    me = owner_client.get(f"{base_url}/api/auth/me").json()
    r = owner_client.delete(f"{base_url}/api/users/{me['id']}")
    assert r.status_code == 400


# ---------- Stock adjust ----------
def test_stock_adjust_in_out(owner_client, base_url):
    item = _get_item(owner_client, base_url, "200000000007")
    r = owner_client.post(f"{base_url}/api/stock/adjust", json={
        "item_id": item["id"], "type": "in", "qty": 3, "note": "TEST"
    })
    assert r.status_code == 200
    after = _get_item(owner_client, base_url, "200000000007")
    assert after["stock"] == item["stock"] + 3
    # out exceeding
    r2 = owner_client.post(f"{base_url}/api/stock/adjust", json={
        "item_id": item["id"], "type": "out", "qty": 999999, "note": "TEST"
    })
    assert r2.status_code == 400
