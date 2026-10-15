import { useEffect, useState } from "react";
import { CheckCircle, LockSimple, Play, Printer } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/common";
import { useSettings } from "@/context/SettingsContext";
import { api, errMsg } from "@/lib/api";
import { fmtDate, fmtDateTime, linesTotal, num, rp } from "@/lib/format";
import { estimateHtml, printHtml } from "@/lib/print";
import { ItemPicker } from "./ItemPicker";
import { LinesTable } from "./LinesTable";
import { PaymentDialog } from "./PaymentDialog";
import { ReceiptDialog } from "./ReceiptDialog";
import { addItemLine } from "./PartSale";

const Field = ({ label, value, testid }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="font-medium" data-testid={testid}>{value || "-"}</div>
  </div>
);

const ServicesTable = ({ services }) => (
  <div className="overflow-x-auto rounded-md border" data-testid="wo-view-services">
    <Table className="zebra">
      <TableHeader>
        <TableRow className="bg-muted/70 hover:bg-muted/70"><TableHead>Jasa</TableHead><TableHead className="w-36 text-right">Tarif</TableHead></TableRow>
      </TableHeader>
      <TableBody>
        {services.length === 0 && <TableRow><TableCell colSpan={2} className="py-6 text-center text-muted-foreground">Tidak ada jasa</TableCell></TableRow>}
        {services.map((s, i) => (
          <TableRow key={`${s.service_id}-${i}`}><TableCell>{s.name}</TableCell><TableCell className="text-right font-mono">{num(s.price)}</TableCell></TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const reservedQty = (wo, itemId) => wo.parts.filter((p) => p.item_id === itemId).reduce((s, p) => s + p.qty, 0);

const AddParts = ({ wo, onChanged }) => {
  const [pending, setPending] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setPending([]);
  }, [wo.id]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/work-orders/${wo.id}/parts`, { parts: pending.map((l) => ({ item_id: l.item_id, qty: Number(l.qty) })) });
      setPending([]);
      onChanged(data);
      toast.success("Part berhasil ditambahkan");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-dashed border-primary/50 bg-primary/5 p-4" data-testid="wo-add-parts">
      <div className="eyebrow">Penambahan Part</div>
      <ItemPicker onPick={(item) => setPending(addItemLine(pending, item, reservedQty(wo, item.id)))} testid="wo-add-part-picker" />
      {pending.length > 0 && (
        <>
          <LinesTable lines={pending} onChange={setPending} testid="wo-pending-parts" />
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving || pending.some((l) => !(Number(l.qty) > 0))} data-testid="wo-save-parts-button">
              {saving ? "Menyimpan..." : `Simpan Penambahan (${rp(linesTotal(pending))})`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

const Actions = ({ wo, onStatus, onPay }) => {
  const { settings } = useSettings();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {wo.status === "diterima" && (
        <Button variant="outline" onClick={() => onStatus("dikerjakan")} data-testid="wo-status-dikerjakan-button"><Play size={16} className="mr-1.5" /> Mulai Dikerjakan</Button>
      )}
      {wo.status !== "selesai" && (
        <Button variant="outline" onClick={() => onStatus("selesai")} data-testid="wo-status-selesai-button"><CheckCircle size={16} className="mr-1.5" /> Tandai Selesai</Button>
      )}
      <Button variant="outline" onClick={() => printHtml(estimateHtml(wo, settings), settings.paper_width, wo.number)} data-testid="wo-print-estimate-button">
        <Printer size={16} className="mr-1.5" /> Cetak Estimasi
      </Button>
      <Button onClick={onPay} className="tactile ml-auto h-12 px-8 font-heading text-base font-black uppercase" data-testid="wo-pay-button">
        Bayar {rp(wo.estimate_total)}
      </Button>
    </div>
  );
};

export const WorkOrderView = ({ wo, onChanged, onPaid }) => {
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [sale, setSale] = useState(null);

  const setStatus = async (status) => {
    try {
      const { data } = await api.patch(`/work-orders/${wo.id}/status`, { status });
      onChanged(data);
      toast.success(`Status diubah menjadi ${status}`);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const pay = async (p) => {
    setPaying(true);
    try {
      const { data } = await api.post(`/work-orders/${wo.id}/pay`, p);
      setSale(data);
      setPayOpen(false);
      toast.success(`Pembayaran ${data.number} berhasil`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="panel space-y-5 p-5 fade-up" data-testid="wo-view">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-muted-foreground" data-testid="wo-view-number">{wo.number}</div>
          <div className="text-3xl font-black num tracking-tight" data-testid="wo-view-plate">{wo.plate}</div>
          <div className="text-sm text-muted-foreground">{wo.vehicle_desc}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={wo.status} testid="wo-view-status" />
          <span className="inline-flex items-center gap-1 rounded-sm bg-slate-950 px-2 py-1 text-[11px] font-semibold text-slate-200" data-testid="wo-locked-badge">
            <LockSimple size={12} weight="fill" /> Data terkunci · kasir hanya dapat menambah part
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 rounded-md border p-4 md:grid-cols-4">
        <Field label="Pelanggan" value={wo.customer_name} testid="wo-view-customer" />
        <Field label="No. WhatsApp" value={wo.customer_phone} />
        <Field label="Mekanik" value={wo.mechanic_name} testid="wo-view-mechanic" />
        <Field label="KM" value={wo.km} />
        <Field label="Diterima" value={fmtDateTime(wo.created_at)} />
        <Field label="Oleh" value={wo.created_by} />
        <Field label="Next Service" value={wo.next_service_date ? fmtDate(wo.next_service_date) : "-"} />
        <Field label="Catatan" value={wo.note} />
      </div>
      {wo.complaint && (
        <div className="rounded-md bg-muted/60 p-3 text-sm"><span className="font-semibold">Keluhan: </span>{wo.complaint}</div>
      )}
      <div className="space-y-2">
        <div className="eyebrow">Sparepart</div>
        <LinesTable lines={wo.parts} testid="wo-view-parts" empty="Belum ada part" showAddedBy />
      </div>
      <div className="space-y-2">
        <div className="eyebrow">Jasa Servis</div>
        <ServicesTable services={wo.services} />
      </div>
      <AddParts wo={wo} onChanged={onChanged} />
      <div className="grid gap-1 rounded-md bg-slate-950 p-4 text-white">
        <div className="flex justify-between text-sm text-slate-400"><span>Total Part</span><span className="num">{rp(wo.parts_total)}</span></div>
        <div className="flex justify-between text-sm text-slate-400"><span>Total Jasa</span><span className="num">{rp(wo.services_total)}</span></div>
        <div className="flex items-end justify-between pt-1">
          <span className="font-heading font-bold uppercase">Total Tagihan</span>
          <span className="text-3xl font-black text-orange-400 num" data-testid="wo-view-total">{rp(wo.estimate_total)}</span>
        </div>
      </div>
      <Actions wo={wo} onStatus={setStatus} onPay={() => setPayOpen(true)} />
      <PaymentDialog open={payOpen} onOpenChange={setPayOpen} subtotal={wo.estimate_total} onSubmit={pay} loading={paying} title={`Pembayaran Servis ${wo.plate}`} />
      <ReceiptDialog
        sale={sale}
        onClose={() => {
          setSale(null);
          onPaid();
        }}
      />
    </div>
  );
};
