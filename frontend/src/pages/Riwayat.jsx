import { useEffect, useState } from "react";
import { Eye, Printer } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange, PageHeader } from "@/components/common";
import { ReceiptDialog } from "@/components/pos/ReceiptDialog";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useRange } from "@/hooks/useRange";
import { api, errMsg } from "@/lib/api";
import { fmtDateTime, methodLabel, rp } from "@/lib/format";
import { printHtml, receiptHtml } from "@/lib/print";

export const SalesTable = ({ rows, onView, onPrint, testid = "sales-table" }) => (
  <div className="overflow-x-auto rounded-md border">
    <Table className="zebra" data-testid={testid}>
      <TableHeader>
        <TableRow className="bg-muted/70 hover:bg-muted/70">
          <TableHead>No. Transaksi</TableHead><TableHead>Waktu</TableHead><TableHead>Jenis</TableHead><TableHead>Pelanggan / Plat</TableHead>
          <TableHead>Mekanik</TableHead><TableHead>Metode</TableHead><TableHead>Kasir</TableHead><TableHead className="text-right">Total</TableHead>
          {(onView || onPrint) && <TableHead className="no-print" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Belum ada transaksi pada periode ini</TableCell></TableRow>}
        {rows.map((s) => (
          <TableRow key={s.id} data-testid={`sale-row-${s.number}`}>
            <TableCell className="font-mono text-xs">{s.number}</TableCell>
            <TableCell className="whitespace-nowrap text-sm">{fmtDateTime(s.created_at)}</TableCell>
            <TableCell>{s.type === "service" ? "Servis" : "Part"}</TableCell>
            <TableCell>{s.plate ? <span className="font-bold num">{s.plate}</span> : s.customer_name || "Umum"}</TableCell>
            <TableCell>{s.mechanic_name || "-"}</TableCell>
            <TableCell>{methodLabel(s.payment_method)}{s.payment_ref ? <span className="block text-[11px] font-mono text-muted-foreground">{s.payment_ref}</span> : null}</TableCell>
            <TableCell>{s.cashier}</TableCell>
            <TableCell className="text-right font-mono font-semibold">{rp(s.total)}</TableCell>
            {(onView || onPrint) && (
              <TableCell className="no-print">
                <div className="flex justify-end gap-1">
                  {onView && <Button variant="ghost" size="icon" onClick={() => onView(s)} data-testid={`sale-view-${s.number}`}><Eye size={16} /></Button>}
                  {onPrint && <Button variant="ghost" size="icon" onClick={() => onPrint(s)} data-testid={`sale-reprint-${s.number}`}><Printer size={16} /></Button>}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default function Riwayat() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [range, setRange] = useRange();
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [view, setView] = useState(null);
  const isOwner = user.role === "owner";

  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/sales", { params: { ...range, type: type === "all" ? "" : type, q } }).then((r) => setRows(r.data)).catch((e) => toast.error(errMsg(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [range, type, q]);

  return (
    <div>
      <PageHeader eyebrow="Operasional" title="Riwayat Transaksi" subtitle={isOwner ? "Lihat & cetak ulang struk transaksi" : "Transaksi hari ini — cetak ulang struk pelanggan"} />
      <div className="panel space-y-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          {isOwner && <DateRange value={range} onChange={setRange} testid="riwayat-range" />}
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-10 w-44" data-testid="riwayat-type-filter"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Semua jenis</SelectItem><SelectItem value="part">Penjualan Part</SelectItem><SelectItem value="service">Servis</SelectItem></SelectContent>
          </Select>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari no. transaksi / plat / nama" className="h-10 max-w-xs" data-testid="riwayat-search" />
          <div className="ml-auto text-right">
            <div className="text-xs text-muted-foreground">{rows.length} transaksi</div>
            <div className="text-xl font-black num" data-testid="riwayat-total">{rp(rows.reduce((s, r) => s + r.total, 0))}</div>
          </div>
        </div>
        <SalesTable rows={rows} onView={setView} onPrint={(s) => printHtml(receiptHtml(s, settings), settings.paper_width, s.number)} />
      </div>
      <ReceiptDialog sale={view} onClose={() => setView(null)} title={`Detail ${view?.number || ""}`} />
    </div>
  );
}
