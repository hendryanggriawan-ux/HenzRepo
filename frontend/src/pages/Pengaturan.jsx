import { useEffect, useState } from "react";
import { FloppyDisk, Printer, Trash, Upload } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/common";
import { useSettings } from "@/context/SettingsContext";
import { api, errMsg } from "@/lib/api";
import { addDays, reminderText, todayStr } from "@/lib/format";
import { printHtml, receiptHtml } from "@/lib/print";

const F = ({ label, hint, children, className = "" }) => (
  <div className={`space-y-1.5 ${className}`}>
    <Label className="text-xs font-semibold">{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

const Section = ({ title, children }) => (
  <div className="panel p-5">
    <div className="eyebrow mb-4">{title}</div>
    <div className="grid gap-4 md:grid-cols-2">{children}</div>
  </div>
);

const sampleSale = (s) => ({
  number: "TRX-CONTOH-0001", type: "service", created_at: new Date().toISOString(), cashier: "Kasir", plate: "B 1234 XYZ",
  vehicle_desc: "Honda Vario 125", km: "12500", mechanic_name: "Mekanik", customer_name: "Pelanggan",
  items: [{ name: "Oli Mesin 0.8L", qty: 1, price: 48000, subtotal: 48000 }], services: [{ name: "Service Ringan", price: 50000 }],
  subtotal: 98000, discount: 0, total: 98000, payment_method: "tunai", paid_amount: 100000, change: 2000,
  next_service_date: addDays(todayStr(), s.service_interval_days),
});

const QrisUpload = ({ value, onChange }) => {
  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      toast.error("Ukuran gambar maksimal 1.5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };
  return (
    <div className="flex items-start gap-4">
      <div className="grid h-40 w-40 place-items-center overflow-hidden rounded-md border bg-white" data-testid="settings-qris-preview">
        {value ? <img src={value} alt="QRIS" className="h-full w-full object-contain" /> : <span className="px-3 text-center text-xs text-slate-500">Belum ada gambar QRIS</span>}
      </div>
      <div className="flex flex-col gap-2">
        <Button asChild variant="outline" size="sm">
          <label className="cursor-pointer"><Upload size={16} className="mr-1.5" /> Unggah QRIS<input type="file" accept="image/*" className="hidden" onChange={onFile} data-testid="settings-qris-input" /></label>
        </Button>
        {value && <Button variant="ghost" size="sm" onClick={() => onChange("")} data-testid="settings-qris-remove"><Trash size={16} className="mr-1.5" /> Hapus</Button>}
      </div>
    </div>
  );
};

export default function Pengaturan() {
  const { settings, setSettings } = useSettings();
  const [f, setF] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setF(settings);
  }, [settings]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...f, low_stock_threshold: Number(f.low_stock_threshold) || 0, high_stock_threshold: Number(f.high_stock_threshold) || 0, service_interval_days: Number(f.service_interval_days) || 1, reminder_days_ahead: Number(f.reminder_days_ahead) || 0 };
      const { data } = await api.put("/settings", payload);
      setSettings(data);
      toast.success("Pengaturan tersimpan");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Sistem"
        title="Pengaturan"
        subtitle="Identitas bengkel, printer struk, QRIS, stok, dan reminder WhatsApp"
        actions={
          <>
            <Button variant="outline" onClick={() => printHtml(receiptHtml(sampleSale(f), f), f.paper_width, "Tes Cetak")} data-testid="settings-test-print"><Printer size={16} className="mr-1.5" /> Tes Cetak</Button>
            <Button onClick={save} disabled={saving} data-testid="settings-save-button"><FloppyDisk size={16} className="mr-1.5" /> {saving ? "Menyimpan..." : "Simpan"}</Button>
          </>
        }
      />
      <div className="space-y-4">
        <Section title="Identitas Bengkel (tampil di struk)">
          <F label="Nama Bengkel"><Input value={f.store_name} onChange={set("store_name")} data-testid="settings-store-name" /></F>
          <F label="No. Telepon"><Input value={f.phone} onChange={set("phone")} data-testid="settings-phone" /></F>
          <F label="Alamat" className="md:col-span-2"><Textarea rows={2} value={f.address} onChange={set("address")} data-testid="settings-address" /></F>
          <F label="Footer Struk" className="md:col-span-2"><Textarea rows={2} value={f.receipt_footer} onChange={set("receipt_footer")} data-testid="settings-footer" /></F>
        </Section>
        <Section title="Printer Thermal">
          <F label="Lebar Kertas" hint="Pilih sesuai printer kasir. Atur margin printer ke 'None' dan skala 100% di dialog cetak browser.">
            <div className="grid grid-cols-2 gap-2">
              {["58", "80"].map((w) => (
                <button key={w} type="button" onClick={() => set("paper_width")(w)} className={`tactile rounded-md border py-3 font-heading font-bold ${f.paper_width === w ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`} data-testid={`settings-paper-${w}`}>
                  {w} mm
                </button>
              ))}
            </div>
          </F>
          <F label="Gambar QRIS Statis Toko" hint="Ditampilkan saat kasir memilih pembayaran QRIS."><QrisUpload value={f.qris_image} onChange={set("qris_image")} /></F>
        </Section>
        <Section title="Stok Barang">
          <F label="Batas Stok Menipis" hint="Dipakai bila barang tidak memiliki stok minimum sendiri."><Input type="number" min="0" value={f.low_stock_threshold} onChange={set("low_stock_threshold")} className="font-mono" data-testid="settings-low-stock" /></F>
          <F label="Batas Stok Masih Banyak" hint="Barang dengan stok ≥ nilai ini masuk laporan stok banyak."><Input type="number" min="0" value={f.high_stock_threshold} onChange={set("high_stock_threshold")} className="font-mono" data-testid="settings-high-stock" /></F>
        </Section>
        <Section title="Reminder WhatsApp">
          <F label="Interval Service Default (hari)"><Input type="number" min="1" value={f.service_interval_days} onChange={set("service_interval_days")} className="font-mono" data-testid="settings-service-interval" /></F>
          <F label="Tampilkan Reminder H- (hari)"><Input type="number" min="0" value={f.reminder_days_ahead} onChange={set("reminder_days_ahead")} className="font-mono" data-testid="settings-reminder-ahead" /></F>
          <F label="Kode Negara" hint="Nomor 08xx otomatis diubah ke format internasional."><Input value={f.country_code} onChange={set("country_code")} className="font-mono" data-testid="settings-country-code" /></F>
          <F label="Template Pesan" hint="Variabel: {nama} {plat} {kendaraan} {tanggal} {bengkel}" className="md:col-span-2"><Textarea rows={4} value={f.wa_template} onChange={set("wa_template")} data-testid="settings-wa-template" /></F>
          <div className="md:col-span-2 whitespace-pre-line rounded-md bg-emerald-50 p-3 text-sm text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100" data-testid="settings-wa-preview">
            {reminderText(f, { customer_name: "Budi", plate: "B 1234 XYZ", vehicle_desc: "Honda Vario 125", next_service_date: todayStr() })}
          </div>
        </Section>
        <div className="panel p-5 text-sm" data-testid="settings-config-info">
          <div className="eyebrow mb-2">File Konfigurasi Server</div>
          <p className="text-muted-foreground">Koneksi database, akun owner awal, zona waktu, dan kunci keamanan diatur di <code className="font-mono">backend/.env</code>. Alamat API untuk aplikasi diatur di <code className="font-mono">frontend/.env</code> (<code className="font-mono">REACT_APP_BACKEND_URL</code>). Lihat <code className="font-mono">PANDUAN_INSTALASI.md</code> untuk instalasi offline & hosting manual.</p>
        </div>
      </div>
    </div>
  );
}
