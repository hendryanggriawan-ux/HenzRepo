import { Badge } from "@/components/ui/badge";
import { fmtDate, rp } from "@/lib/format";

const ActiveBadge = ({ active }) => (
  <Badge variant="outline" className={`rounded-sm text-[10px] uppercase ${active ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200" : "text-muted-foreground"}`}>
    {active ? "Aktif" : "Nonaktif"}
  </Badge>
);

export const MASTER_CONFIGS = {
  jasa: {
    title: "Jasa Servis", subtitle: "Daftar jasa & tarif pengerjaan mekanik", endpoint: "/services", testid: "service",
    fields: [
      { name: "name", label: "Nama Jasa", required: true, wide: true },
      { name: "price", label: "Tarif (Rp)", type: "number", required: true, mono: true },
    ],
    columns: [
      { key: "name", label: "Nama Jasa" },
      { key: "price", label: "Tarif", align: "right", mono: true, render: (r) => rp(r.price) },
    ],
  },
  supplier: {
    title: "Supplier", subtitle: "Supplier / distributor sparepart", endpoint: "/suppliers", testid: "supplier",
    fields: [
      { name: "name", label: "Nama Supplier", required: true },
      { name: "phone", label: "No. Telepon", mono: true },
      { name: "address", label: "Alamat", type: "textarea" },
    ],
    columns: [{ key: "name", label: "Nama" }, { key: "phone", label: "Telepon", mono: true }, { key: "address", label: "Alamat" }],
  },
  pelanggan: {
    title: "Pelanggan", subtitle: "Data pelanggan & nomor WhatsApp untuk reminder servis", endpoint: "/customers", testid: "customer",
    fields: [
      { name: "name", label: "Nama Pelanggan", required: true },
      { name: "phone", label: "No. WhatsApp", mono: true, placeholder: "08xxxxxxxxxx", hint: "Dipakai untuk reminder next service" },
      { name: "address", label: "Alamat", type: "textarea" },
    ],
    columns: [{ key: "name", label: "Nama" }, { key: "phone", label: "WhatsApp", mono: true }, { key: "address", label: "Alamat" }],
  },
  kendaraan: {
    title: "Kendaraan", subtitle: "Kendaraan pelanggan & jadwal servis berikutnya", endpoint: "/vehicles", testid: "vehicle", rowKey: "plate_key",
    fields: [
      { name: "plate", label: "No. Polisi", required: true, mono: true, placeholder: "B 1234 XYZ" },
      { name: "customer_id", label: "Pemilik", type: "select", optional: true, optionsEndpoint: "/customers", mapOption: (c) => ({ value: c.id, label: `${c.name}${c.phone ? ` · ${c.phone}` : ""}` }) },
      { name: "brand", label: "Merk" },
      { name: "model", label: "Tipe" },
      { name: "year", label: "Tahun" },
      { name: "color", label: "Warna" },
      { name: "next_service_date", label: "Jadwal Service Berikutnya", type: "date" },
    ],
    columns: [
      { key: "plate", label: "No. Polisi", render: (r) => <span className="font-black num">{r.plate}</span> },
      { key: "model", label: "Kendaraan", render: (r) => [r.brand, r.model, r.year].filter(Boolean).join(" ") || "-" },
      { key: "customer_name", label: "Pemilik" },
      { key: "customer_phone", label: "WhatsApp", mono: true },
      { key: "last_service_date", label: "Servis Terakhir", render: (r) => fmtDate(r.last_service_date) },
      { key: "next_service_date", label: "Servis Berikutnya", render: (r) => fmtDate(r.next_service_date) },
    ],
  },
  mekanik: {
    title: "Mekanik", subtitle: "Mekanik yang mengerjakan kendaraan — tercatat di laporan jasa", endpoint: "/mechanics", testid: "mechanic",
    fields: [
      { name: "name", label: "Nama Mekanik", required: true },
      { name: "phone", label: "No. HP", mono: true },
      { name: "active", label: "Status", type: "switch" },
    ],
    columns: [{ key: "name", label: "Nama" }, { key: "phone", label: "No. HP", mono: true }, { key: "active", label: "Status", render: (r) => <ActiveBadge active={r.active} /> }],
  },
  pengguna: {
    title: "Pengguna", subtitle: "Akun login Owner/Admin & Kasir", endpoint: "/users", testid: "user", rowKey: "username",
    fields: [
      { name: "username", label: "Username", required: true, mono: true },
      { name: "name", label: "Nama Lengkap", required: true },
      { name: "email", label: "Email" },
      { name: "role", label: "Role", type: "select", required: true, options: [{ value: "owner", label: "Owner / Admin" }, { value: "kasir", label: "Kasir" }] },
      { name: "password", label: "Password", type: "password", requiredOnCreate: true, editPlaceholder: "Kosongkan jika tidak diubah", hint: "Minimal 6 karakter" },
      { name: "active", label: "Status", type: "switch" },
    ],
    columns: [
      { key: "username", label: "Username", mono: true },
      { key: "name", label: "Nama" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role", render: (r) => (r.role === "owner" ? "Owner / Admin" : "Kasir") },
      { key: "active", label: "Status", render: (r) => <ActiveBadge active={r.active} /> },
    ],
  },
};
