# PRD — POS Bengkel Sepeda Motor

## Original Problem Statement
buatkan sebuah halaman website untuk point of sales dari sebuah bengkel sepeda motor, dalam program ini harus bisa melakukan pembelian barang dari supplier/distributor, penerimaan kendaraan dan dapat melakukan estmasi biaya, transaksi penjualan tanpa jasa perbaikan, dan untuk kasir dapat mencari kendaraan pada bagian yang telah diterima dan tidak dapat di edit kecuali jika ada penambahan part. program harus bisa mencetak struk transaksi yang digunakan oleh konsumen. pada bagian owner/admin harus mempunyai sebuah master meliputi dari penjualan, pembelian, stok barang, laporan barang yang sudah menipis dan laporan barang yang masih banyak, laporan jasa mekanik. Untuk barang yang masuk dan keluar bisa diinput menggunakan barcode, untuk barcode juga bisa di scan dan program mencetak barcode barang. untuk sistem pembayaran transaksi oleh kasir kepada pelanggan disediakan fitur tunai,qris, debit, credit, transfer. Program harus bisa memberikan reminder kepada pelanggan untuk melakukan next service melalui whatsapp yang sudah tersimpan pada data pelanggan pada saat akan melakukan service. tambahkan nama mekanik yang akan mengerjakan kendaraan agar mudah di lacak di dalam laporan  dan buatkan dalam bentuk offline dan nanti akan diupload dan dihosting secara manual, pastikan berikan config untuk pengaturan, untuk pencetakan digunakan print thermal kasir pada umumnya

### User choices
- Stack: React + FastAPI + MongoDB, jalan offline di PC/LAN, hosting manual (config .env + halaman Pengaturan). (User juga mencentang opsi "full browser/IndexedDB" — belum dibangun.)
- Reminder WhatsApp via link wa.me (pesan terisi otomatis)
- Login username/password, role Owner/Admin & Kasir
- Lebar kertas thermal dipilih di Pengaturan (58/80mm)
- Pembayaran hanya dicatat (metode + no. ref); QRIS = gambar statis dari Pengaturan

## Architecture
- Backend FastAPI: core.py (db, auth JWT Bearer, BaseDocument, helpers), models.py, stock.py, seed.py, routes_auth.py, routes_master.py, routes_trx.py, routes_reports.py
- Frontend React (CRA/craco) + Tailwind + shadcn, fonts self-hosted (@fontsource), icons @phosphor-icons/react, barcode JsBarcode (CODE128), camera scan html5-qrcode
- Thermal print: HTML struk/estimasi/label dirender ke hidden iframe → window.print (58/80mm CSS @page)
- Config: backend/.env(.example), frontend/.env(.example), PANDUAN_INSTALASI.md (offline LAN + VPS Nginx/systemd)

## User Personas
- Owner/Admin: master data, laporan, pengaturan, edit work order
- Kasir: penjualan part, penerimaan kendaraan, cari kendaraan diterima (read-only + tambah part), pembayaran, struk, reminder WA

## Core Requirements (static)
Pembelian supplier, penerimaan kendaraan + estimasi, penjualan tanpa jasa, kasir lock edit kecuali tambah part, cetak struk thermal, master & laporan (penjualan, pembelian, stok, stok menipis, stok banyak, jasa mekanik), barcode scan/print, 5 metode bayar, reminder WA, mekanik per WO, offline + config.

## Implemented (2026-10-15)
- Auth JWT (Bearer), brute-force lockout, role owner/kasir, seed owner dari .env (hendryanggriawan@gmail.com), kasir demo
- Kasir POS: penjualan part (scan barcode/Enter, kamera), pembayaran tunai/QRIS/debit/kredit/transfer, diskon, kembalian, struk preview + cetak
- Penerimaan kendaraan: lookup plat, upsert pelanggan & kendaraan, mekanik, keluhan, estimasi part+jasa, next service date, cetak estimasi, kirim estimasi WA; daftar servis + edit/batal (owner)
- Kendaraan diterima di kasir: read-only + tambah part, status, bayar → struk + reminder WA
- Pembelian dari supplier (stok masuk, update harga beli, cetak label barcode qty)
- Master: barang (auto barcode, preview, cetak label, mutasi manual masuk/keluar), jasa, supplier, pelanggan, kendaraan, mekanik, pengguna
- Laporan: penjualan (per metode, laba kotor), pembelian, stok (semua/menipis/banyak), jasa mekanik, mutasi stok; cetak laporan
- Reminder next service list + wa.me, Pengaturan (identitas, kertas, QRIS, threshold, template WA, tes cetak)
- Testing: iteration_1 — backend 29/29 pass, frontend flows pass

## Implemented (2026-10-15, iterasi 2)
- Tutup Kasir harian (/tutup-kasir, owner & kasir): rekap transaksi per kasir sejak tutup terakhir (atau awal hari), per metode bayar, modal awal + uang fisik → kas seharusnya & selisih, simpan (TK-YYYYMMDD-NNNN), cetak slip thermal, riwayat (owner semua kasir, kasir milik sendiri)
- Sales menyimpan cashier_id
- Export Excel (.xlsx via openpyxl, owner): laporan penjualan (Ringkasan/Transaksi/Detail Item), pembelian, stok (semua/menipis/banyak), jasa mekanik, mutasi stok, tutup kasir
- Testing: iteration_2 — backend 41/41 pass, UI export & tutup kasir pass

## Implemented (2026-10-15, iterasi 3)
- Import Barang dari Excel (owner, Master Barang): unduh template (.xlsx + sheet Petunjuk), cek file (dry run: baru/diperbarui/error per baris), proses import. Kode kosong = auto-generate, kode ada = update data (stok tidak diubah), stok awal barang baru tercatat di mutasi (ref IMPORT). Validasi nama, harga jual, angka, duplikat, maks 5MB/5000 baris
- Testing: iteration_3 — backend 49/49 pass, UI import pass

## Prioritized Backlog
- P1 (diminta user, belum dikerjakan): #1 Pengeluaran kas, #2 Batal/retur transaksi, #7 Riwayat servis per kendaraan, #14 Stok opname
- P1: Versi full-browser (IndexedDB) bila user memang menginginkannya
- P1: Ganti password sendiri untuk kasir; TTL index login_attempts
- P2: Export laporan ke CSV/PDF; retur penjualan/pembelian; pencatatan pengeluaran kas di tutup kasir
- P2: Silent print ESC/POS via local agent; migrasi on_event → lifespan

## Next Tasks
- Isi identitas bengkel & upload QRIS di Pengaturan, set SEED_DEMO=false untuk produksi
