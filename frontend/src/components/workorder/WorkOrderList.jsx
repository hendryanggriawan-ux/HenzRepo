import { useCallback, useEffect, useState } from "react";
import { PencilSimple, Printer, WhatsappLogo, XCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog, StatusBadge } from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { api, errMsg } from "@/lib/api";
import { fmtDateTime, rp, waLink } from "@/lib/format";
import { estimateHtml, printHtml } from "@/lib/print";

const STATUS_FILTER = [
  ["active", "Aktif (belum dibayar)"], ["all", "Semua"], ["diterima", "Diterima"], ["dikerjakan", "Dikerjakan"],
  ["selesai", "Selesai"], ["dibayar", "Dibayar"], ["batal", "Batal"],
];

const estimateWaText = (wo, s) =>
  `Halo ${wo.customer_name}, berikut estimasi servis kendaraan ${wo.plate} di ${s.store_name}:\n` +
  [...wo.parts.map((p) => `- ${p.name} x${p.qty}: ${rp(p.subtotal)}`), ...wo.services.map((x) => `- ${x.name}: ${rp(x.price)}`)].join("\n") +
  `\nTotal estimasi: ${rp(wo.estimate_total)}\nNo. WO: ${wo.number}`;

const RowActions = ({ wo, isOwner, onEdit, onCancel }) => {
  const { settings } = useSettings();
  const open = ["diterima", "dikerjakan", "selesai"].includes(wo.status);
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" title="Cetak estimasi" onClick={() => printHtml(estimateHtml(wo, settings), settings.paper_width, wo.number)} data-testid={`wo-list-print-${wo.number}`}><Printer size={16} /></Button>
      {wo.customer_phone && (
        <Button asChild variant="ghost" size="icon" title="Kirim estimasi via WhatsApp">
          <a href={waLink(wo.customer_phone, estimateWaText(wo, settings), settings.country_code)} target="_blank" rel="noreferrer" data-testid={`wo-list-wa-${wo.number}`}><WhatsappLogo size={16} /></a>
        </Button>
      )}
      {isOwner && open && <Button variant="ghost" size="icon" title="Edit" onClick={() => onEdit(wo)} data-testid={`wo-list-edit-${wo.number}`}><PencilSimple size={16} /></Button>}
      {isOwner && open && <Button variant="ghost" size="icon" title="Batalkan" onClick={() => onCancel(wo)} data-testid={`wo-list-cancel-${wo.number}`}><XCircle size={16} className="text-destructive" /></Button>}
    </div>
  );
};

export const WorkOrderList = ({ onEdit }) => {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [rows, setRows] = useState([]);
  const [toCancel, setToCancel] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api.get("/work-orders", { params: { q, status } });
    setRows(data);
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(() => {
      load().catch((e) => toast.error(errMsg(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [load]);

  const cancel = async () => {
    try {
      await api.patch(`/work-orders/${toCancel.id}/status`, { status: "batal" });
      toast.success("Servis dibatalkan");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
    setToCancel(null);
  };

  return (
    <div className="panel p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari No. Polisi / No. WO / Pelanggan" className="h-10 max-w-sm" data-testid="wo-list-search" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-10 w-56" data-testid="wo-list-status-filter"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_FILTER.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table className="zebra" data-testid="wo-list-table">
          <TableHeader>
            <TableRow className="bg-muted/70 hover:bg-muted/70">
              <TableHead>No. WO</TableHead><TableHead>Tanggal</TableHead><TableHead>No. Polisi</TableHead><TableHead>Pelanggan</TableHead>
              <TableHead>Mekanik</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Estimasi</TableHead><TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Tidak ada data servis</TableCell></TableRow>}
            {rows.map((wo) => (
              <TableRow key={wo.id} data-testid={`wo-list-row-${wo.number}`}>
                <TableCell className="font-mono text-xs">{wo.number}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">{fmtDateTime(wo.created_at)}</TableCell>
                <TableCell className="font-black num">{wo.plate}</TableCell>
                <TableCell>{wo.customer_name}</TableCell>
                <TableCell>{wo.mechanic_name}</TableCell>
                <TableCell><StatusBadge status={wo.status} /></TableCell>
                <TableCell className="text-right font-mono font-semibold">{rp(wo.estimate_total)}</TableCell>
                <TableCell><RowActions wo={wo} isOwner={user.role === "owner"} onEdit={onEdit} onCancel={setToCancel} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ConfirmDialog open={Boolean(toCancel)} onOpenChange={(v) => !v && setToCancel(null)} title="Batalkan servis?" description={`Work order ${toCancel?.number || ""} (${toCancel?.plate || ""}) akan dibatalkan.`} onConfirm={cancel} confirmLabel="Batalkan Servis" testid="wo-cancel-dialog" />
    </div>
  );
};
