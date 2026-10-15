import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://bengkel-kasir-app-3.preview.emergentagent.com"


def _login(username, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": username, "password": password}, timeout=30)
    assert r.status_code == 200, f"Login failed for {username}: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def owner_token():
    return _login("owner", "Bengkel#2026")


@pytest.fixture(scope="session")
def kasir_token():
    return _login("kasir", "kasir123")


@pytest.fixture
def owner_client(owner_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {owner_token}", "Content-Type": "application/json"})
    return s


@pytest.fixture
def kasir_client(kasir_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {kasir_token}", "Content-Type": "application/json"})
    return s


@pytest.fixture
def base_url():
    return BASE_URL
