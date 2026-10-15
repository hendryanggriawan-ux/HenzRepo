# Panduan Instalasi Offline & Hosting Manual — POS Bengkel

Aplikasi terdiri dari 3 bagian:

| Bagian | Teknologi | Folder |
|---|---|---|
| Frontend (tampilan) | React | `frontend/` |
| Backend (API) | Python FastAPI | `backend/` |
| Database | MongoDB | (service terpisah) |

Semua berjalan **tanpa internet** di 1 PC server bengkel. Komputer kasir / tablet lain cukup membuka alamat IP server di browser (satu jaringan LAN/WiFi).

---

## 1. Kebutuhan

- Windows 10/11, Ubuntu 22.04+, atau VPS Linux
- Python 3.11+
- Node.js 18+ dan Yarn (`npm i -g yarn` — hanya untuk install yarn)
- MongoDB Community Server 6/7 (https://www.mongodb.com/try/download/community)
- Printer thermal kasir 58mm / 80mm dengan driver terpasang (mis. driver "POS-58" / "POS-80")
- (Opsional) Barcode scanner USB — bekerja seperti keyboard, tidak perlu driver

---

## 2. File Konfigurasi

### `backend/.env`  (salin dari `backend/.env.example`)

| Kunci | Keterangan |
|---|---|
| `MONGO_URL` | Alamat MongoDB, contoh `mongodb://localhost:27017` |
| `DB_NAME` | Nama database, contoh `pos_bengkel` |
| `CORS_ORIGINS` | Asal frontend yang diizinkan. `*` atau `http://192.168.1.10:3000` (pisahkan koma) |
| `JWT_SECRET` | String acak panjang (min. 32 karakter). Ganti untuk keamanan |
| `TOKEN_EXPIRE_HOURS` | Lama sesi login (jam), default `12` |
| `APP_TIMEZONE` | Zona waktu laporan, `Asia/Jakarta` / `Asia/Makassar` / `Asia/Jayapura` |
| `ADMIN_USERNAME` | Username owner awal |
| `ADMIN_EMAIL` | Email owner (bisa dipakai login) |
| `ADMIN_PASSWORD` | Password owner awal |
| `ADMIN_NAME` | Nama tampilan owner |
| `ADMIN_SYNC_PASSWORD` | `true` = password owner selalu disamakan dengan `.env` setiap server start. `false` = hanya dipakai saat pertama kali |
| `SEED_DEMO` | `true` = isi data contoh (barang, jasa, mekanik, akun kasir demo) bila database kosong. **Set `false` untuk produksi** |
| `DEMO_KASIR_PASSWORD` | Password akun `kasir` demo (hanya bila SEED_DEMO=true) |

### `frontend/.env`  (salin dari `frontend/.env.example`)

| Kunci | Keterangan |
|---|---|
| `REACT_APP_BACKEND_URL` | Alamat backend tanpa `/api`. Contoh LAN: `http://192.168.1.10:8001`. Bila frontend & backend di domain yang sama lewat Nginx, **kosongkan** (`REACT_APP_BACKEND_URL=`) |

> Setelah mengubah `frontend/.env`, frontend harus di-build ulang (`yarn build`).

### Pengaturan di Aplikasi (menu **Pengaturan**, login sebagai owner)
- Nama, alamat, telepon bengkel & footer struk
- Lebar kertas printer thermal 58mm / 80mm + tombol **Tes Cetak**
- Gambar QRIS statis toko (muncul saat kasir memilih QRIS)
- Batas stok menipis & stok masih banyak
- Interval service default, H- reminder, kode negara, dan template pesan WhatsApp

---

## 3. Instalasi di PC Bengkel (offline / LAN)

```bash
# 1) Backend
cd backend
python -m venv venv
# Windows: venv\Scripts\activate   |  Linux: source venv/bin/activate
pip install fastapi uvicorn motor pymongo pydantic python-dotenv bcrypt pyjwt tzdata openpyxl
copy .env.example .env      # Linux: cp .env.example .env  → lalu edit isinya
uvicorn server:app --host 0.0.0.0 --port 8001

# 2) Frontend (terminal lain)
cd frontend
copy .env.example .env      # isi REACT_APP_BACKEND_URL=http://IP-PC-SERVER:8001
yarn install
yarn build                  # hasil di folder frontend/build
npx serve -s build -l 3000  # atau pakai Nginx (lihat bagian 4)
```

> Catatan: `pip install` & `yarn install` butuh internet **sekali saja** saat instalasi. Setelah itu aplikasi berjalan sepenuhnya offline (font & ikon sudah dibundel, tidak memakai CDN).

Buka di browser: `http://IP-PC-SERVER:3000` → login dengan akun owner dari `.env`.

Agar otomatis jalan saat PC menyala: gunakan **NSSM** (Windows) atau **systemd** (Linux) untuk perintah `uvicorn` dan `serve`.

---

## 4. Hosting Manual di VPS (Nginx, satu domain)

1. Install MongoDB, Python, Node, Nginx di VPS.
2. Upload folder `backend/` dan hasil `frontend/build/` (build dengan `REACT_APP_BACKEND_URL=` kosong).
3. Jalankan backend sebagai service:

```ini
# /etc/systemd/system/pos-bengkel.service
[Unit]
Description=POS Bengkel API
After=network.target mongod.service

[Service]
WorkingDirectory=/opt/pos-bengkel/backend
ExecStart=/opt/pos-bengkel/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
```

4. Konfigurasi Nginx:

```nginx
server {
    listen 80;
    server_name pos.domainanda.com;

    root /opt/pos-bengkel/frontend/build;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 5m;
    }

    location / {
        try_files $uri /index.html;
    }
}
```

5. Pasang HTTPS (`certbot --nginx`). HTTPS diperlukan bila ingin memakai **scan barcode via kamera** dari HP/tablet (browser hanya mengizinkan kamera di HTTPS atau localhost).

---

## 5. Printer Thermal

- Struk, estimasi servis, dan label barcode dicetak lewat dialog print browser.
- Di dialog print pilih printer thermal, **Margins: None**, **Scale: 100%**, matikan **Headers and footers**.
- Untuk cetak tanpa dialog (silent print) di Chrome: jalankan Chrome dengan flag `--kiosk-printing` dan jadikan printer thermal sebagai default.
- Ukuran kertas (58/80mm) diatur di menu Pengaturan.

## 6. Barcode

- Barang tanpa kode otomatis dibuatkan kode 12 digit (format CODE128).
- Barcode pabrik bisa di-scan langsung ke kolom **Kode / Barcode** saat tambah barang.
- Kolom input barang di Kasir, Penerimaan, Pembelian, dan Mutasi Stok menerima scanner USB (scan → Enter otomatis) atau tombol kamera.

## 7. Backup Data

```bash
mongodump --db pos_bengkel --out backup_$(date +%F)
mongorestore --db pos_bengkel backup_YYYY-MM-DD/pos_bengkel
```
