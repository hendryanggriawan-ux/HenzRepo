import { useEffect, useState } from "react";
import { MagnifyingGlass, Plus, Trash, Wrench } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ItemPicker } from "@/components/pos/ItemPicker";
import { LinesTable } from "@/components/pos/LinesTable";
import { addItemLine } from "@/components/pos/PartSale";
import { useSettings } from "@/context/SettingsContext";
import { api, errMsg } from "@/lib/api";
import { addDays, fmtDate, linesTotal, num, rp, todayStr } from "@/lib/format";

const F = ({ label, children, className = "" }) => (
  <div className={`space-y-1.5 ${className}`}>
    <Label className="text-xs font-semibold">{label}</Label>
    {children}
  </div>
);

const emptyForm = (interval) => ({
  plate: "", brand: "", model: "", year: "", color: "", customer_name: "", customer_phone: "", customer_address: "",
  km: "", complaint: "", mechanic_id: "", next_service_date: addDays(todayStr(), interval || 60), note: "",
});

const VehicleSection = ({ f, set, edit, onLookup, info }) => (
  <div className="panel space-y-4 p-5">
    <div className="eyebrow">Kendaraan & Pelanggan</div>
    <F label="No. Polisi *">
      <div className="flex gap-2">
        <Input value={f.plate} onChange={set("plate")} onBlur={onLookup} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onLookup())} disabled={edit} placeholder="B 1234 XYZ" className="h-12 text-xl font-black uppercase num" data-testid="wo-form-plate" />
        {!edit && <Button type="button" variant="outline" className="h-12" onClick={onLookup} data-testid="wo-form-plate-lookup"><MagnifyingGlass size={18} /></Button>}
      </div>
      {info && <p className="text-xs text-muted-foreground" data-testid="wo-form-plate-info">{info}</p>}
    </F>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <F label="Merk"><Input value={f.brand} onChange={set("brand")} disabled={edit} placeholder="Honda" data-testid="wo-form-brand" /></F>
      <F label="Tipe"><Input value={f.model} onChange={set("model")} disabled={edit} placeholder="Vario 125" data-testid="wo-form-model" /></F>
      <F label="Tahun"><Input value={f.year} onChange={set("year")} disabled={edit} data-testid="wo-form-year" /></F>
      <F label="Warna"><Input value={f.color} onChange={set("color")} disabled={edit} data-testid="wo-form-color" /></F>
    </div>
    <div className="grid gap-3 md:grid-cols-2">
      <F label="Nama Pelanggan *"><Input value={f.customer_name} onChange={set("customer_name")} disabled={edit} data-testid="wo-form-customer-name" /></F>
      <F label="No. WhatsApp"><Input value={f.customer_phone} onChange={set("customer_phone")} disabled={edit} placeholder="08xxxxxxxxxx" className="font-mono" data-testid="wo-form-customer-phone" /></F>
      <F label="Alamat" className="md:col-span-2"><Input value={f.customer_address} onChange={set("customer_address")} disabled={edit} data-testid="wo-form-customer-address" /></F>
    </div>
  </div>
);

const JobSection = ({ f, set, mechanics }) => (
  <div className="panel space-y-4 p-5">
    <div className="eyebrow">Pengerjaan</div>
    <div className="grid gap-3 md:grid-cols-2">
      <F label="Mekanik *">
        <Select value={f.mechanic_id} onValueChange={(v) => set("mechanic_id")(v)}>
          <SelectTrigger className="h-10" data-testid="wo-form-mechanic"><SelectValue placeholder="Pilih mekanik" /></SelectTrigger>
          <SelectContent>
            {mechanics.map((m) => <SelectItem key={m.id} value={m.id} data-testid={`wo-form-mechanic-option-${m.id}`}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </F>
      <F label="Kilometer"><Input value={f.km} onChange={set("km")} placeholder="12500" className="font-mono" data-testid="wo-form-km" /></F>
      <F label="Keluhan / Permintaan" className="md:col-span-2"><Textarea rows={3} value={f.complaint} onChange={set("complaint")} placeholder="Contoh: ganti oli, rem depan bunyi" data-testid="wo-form-complaint" /></F>
      <F label="Jadwal Service Berikutnya"><Input type="date" value={f.next_service_date} onChange={set("next_service_date")} data-testid="wo-form-next-service" /></F>
      <F label="Catatan"><Input value={f.note} onChange={set("note")} data-testid="wo-form-note" /></F>
    </div>
  </div>
);

const ServiceLines = ({ services, setServices, serviceList }) => {
  const [pick, setPick] = useState("");
  const add = () => {
    const s = serviceList.find((x) => x.id === pick);
    if (!s) return;
    setServices([...services, { service_id: s.id, name: s.name, price: s.price }]);
    setPick("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select value={pick} onValueChange={setPick}>
          <SelectTrigger className="h-10 flex-1" data-testid="wo-form-service-select"><SelectValue placeholder="Pilih jasa servis" /></SelectTrigger>
          <SelectContent>
            {serviceList.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} — {rp(s.price)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" className="h-10" onClick={add} disabled={!pick} data-testid="wo-form-service-add"><Plus size={16} className="mr-1" /> Jasa</Button>
      </div>
      {services.map((s, i) => (
        <div key={`${s.service_id}-${i}`} className="flex items-center gap-2 rounded-md border px-3 py-1.5" data-testid={`wo-form-service-row-${i}`}>
          <Wrench size={16} className="text-primary" />
          <span className="flex-1 text-sm font-medium">{s.name}</span>
          <Input type="number" min="0" value={s.price} onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} className="h-9 w-32 text-right font-mono" data-testid={`wo-form-service-price-${i}`} />
          <Button type="button" variant="ghost" size="icon" onClick={() => setServices(services.filter((_, j) => j !== i))} data-testid={`wo-form-service-remove-${i}`}><Trash size={16} /></Button>
        </div>
      ))}
    </div>
  );
};

const toForm = (wo) => ({
  plate: wo.plate, brand: "", model: wo.vehicle_desc, year: "", color: "", customer_name: wo.customer_name,
  customer_phone: wo.customer_phone, customer_address: "", km: wo.km, complaint: wo.complaint,
  mechanic_id: wo.mechanic_id, next_service_date: wo.next_service_date, note: wo.note,
});

export const WorkOrderForm = ({ initial, onSaved }) => {
  const { settings } = useSettings();
  const edit = Boolean(initial);
  const [f, setF] = useState(() => (edit ? toForm(initial) : emptyForm(settings.service_interval_days)));
  const [parts, setParts] = useState(() => (edit ? initial.parts.map((p) => ({ ...p })) : []));
  const [services, setServices] = useState(() => (edit ? initial.services.map((s) => ({ ...s })) : []));
  const [mechanics, setMechanics] = useState([]);
  const [serviceList, setServiceList] = useState([]);
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [looked, setLooked] = useState("");

  useEffect(() => {
    api.get("/mechanics").then((r) => setMechanics(r.data.filter((m) => m.active))).catch(() => {});
    api.get("/services").then((r) => setServiceList(r.data)).catch(() => {});
  }, []);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));

  const lookup = async () => {
    const plate = f.plate.trim();
    if (edit || !plate || plate === looked) return;
    setLooked(plate);
    try {
      const { data } = await api.get(`/vehicles/plate/${encodeURIComponent(plate)}`);
      const v = data.vehicle;
      const c = data.customer || {};
      setF((p) => ({ ...p, brand: v.brand, model: v.model, year: v.year, color: v.color, customer_name: c.name || v.customer_name, customer_phone: c.phone || v.customer_phone, customer_address: c.address || "" }));
      setInfo(`Kendaraan terdaftar · servis terakhir ${v.last_service_date ? fmtDate(v.last_service_date) : "-"} · KM ${v.last_km || "-"}`);
    } catch {
      setInfo("Kendaraan baru — data kendaraan & pelanggan akan disimpan otomatis.");
    }
  };

  const total = linesTotal(parts) + services.reduce((s, x) => s + (Number(x.price) || 0), 0);

  const submit = async () => {
    if (!f.plate.trim() || !f.customer_name.trim() || !f.mechanic_id) {
      toast.error("No. polisi, nama pelanggan, dan mekanik wajib diisi");
      return;
    }
    setSaving(true);
    const partPayload = parts.map((p) => ({ item_id: p.item_id, qty: Number(p.qty), ...(edit ? { price: Number(p.price) } : {}) }));
    const servicePayload = services.map((s) => ({ service_id: s.service_id, price: Number(s.price) || 0 }));
    try {
      const { data } = edit
        ? await api.put(`/work-orders/${initial.id}`, { km: f.km, complaint: f.complaint, mechanic_id: f.mechanic_id, parts: partPayload, services: servicePayload, next_service_date: f.next_service_date, note: f.note })
        : await api.post("/work-orders", { ...f, parts: partPayload, services: servicePayload });
      onSaved(data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_440px]" data-testid="wo-form">
      <div className="space-y-4">
        <VehicleSection f={f} set={set} edit={edit} onLookup={lookup} info={info} />
        <JobSection f={f} set={set} mechanics={mechanics} />
      </div>
      <div className="panel flex flex-col gap-4 p-5">
        <div className="eyebrow">Estimasi Biaya</div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Sparepart</Label>
          <ItemPicker onPick={(item) => setParts(addItemLine(parts, item))} testid="wo-form-part-picker" />
          <LinesTable lines={parts} onChange={setParts} priceEditable={edit} testid="wo-form-parts" empty="Belum ada part" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Jasa</Label>
          <ServiceLines services={services} setServices={setServices} serviceList={serviceList} />
        </div>
        <div className="mt-auto rounded-md bg-slate-950 p-4 text-white">
          <div className="flex justify-between text-sm text-slate-400"><span>Part ({num(parts.length)})</span><span className="num">{rp(linesTotal(parts))}</span></div>
          <div className="flex justify-between text-sm text-slate-400"><span>Jasa ({num(services.length)})</span><span className="num">{rp(total - linesTotal(parts))}</span></div>
          <div className="flex items-end justify-between pt-1">
            <span className="font-heading font-bold uppercase">Estimasi</span>
            <span className="text-3xl font-black text-orange-400 num" data-testid="wo-form-total">{rp(total)}</span>
          </div>
        </div>
        <Button onClick={submit} disabled={saving} className="tactile h-12 font-heading text-base font-black uppercase" data-testid="wo-form-submit">
          {saving ? "Menyimpan..." : edit ? "Simpan Perubahan" : "Simpan Penerimaan"}
        </Button>
      </div>
    </div>
  );
};
