export const rp = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString("id-ID")}`;
export const num = (n) => (Number(n) || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

export const fmtDateTime = (v) =>
  v
    ? new Date(v).toLocaleString("id-ID", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "-";

export const fmtDate = (ymd) =>
  ymd ? new Date(`${ymd}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "-";

const pad = (n) => String(n).padStart(2, "0");
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => ymd(new Date());
export const addDays = (base, days) => {
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + Number(days || 0));
  return ymd(d);
};
export const daysBetween = (a, b) =>
  Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);

export const linesTotal = (lines) =>
  lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0);

export const METHODS = [
  { value: "tunai", label: "Tunai" },
  { value: "qris", label: "QRIS" },
  { value: "debit", label: "Debit" },
  { value: "kredit", label: "Kartu Kredit" },
  { value: "transfer", label: "Transfer" },
];
export const methodLabel = (v) => METHODS.find((m) => m.value === v)?.label || v;

export const STATUS = {
  diterima: { label: "Diterima", cls: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800" },
  dikerjakan: { label: "Dikerjakan", cls: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800" },
  selesai: { label: "Selesai", cls: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800" },
  dibayar: { label: "Dibayar", cls: "bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700" },
  batal: { label: "Batal", cls: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800" },
};

export function waPhone(phone, cc = "62") {
  let p = String(phone || "").replace(/\D/g, "");
  if (p.startsWith("0")) p = cc + p.slice(1);
  else if (p.startsWith("8")) p = cc + p;
  return p;
}

export const fillTemplate = (tpl, vars) => String(tpl || "").replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);

export const waLink = (phone, text, cc) => `https://wa.me/${waPhone(phone, cc)}?text=${encodeURIComponent(text)}`;

export const vehicleName = (v) =>
  v.vehicle_desc || [v.brand, v.model, v.year].filter(Boolean).join(" ") || "Anda";

export const reminderText = (settings, v) =>
  fillTemplate(settings.wa_template, {
    nama: v.customer_name || "Pelanggan",
    plat: v.plate,
    kendaraan: vehicleName(v),
    tanggal: fmtDate(v.next_service_date),
    bengkel: settings.store_name,
  });
