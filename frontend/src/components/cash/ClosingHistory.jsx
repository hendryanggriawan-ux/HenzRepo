import { useEffect, useState } from "react";
import { Eye, Printer } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange } from "@/components/common";
import { ExportButton } from "@/components/common/ExportButton";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useRange } from "@/hooks/useRange";
import { api, errMsg } from "@/lib/api";
import { fmtDateTime, num, rp } from "@/lib/format";
import { closingHtml, printHtml } from "@/lib/print";

const diffCls = (d) => (d === 0 ? "text-emerald-600" : d > 0 ? "text-sky-600" : "text-destructive");

export const ClosingHistory = ({ refreshKey, onView }) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [range, setRange] = useRange();
  const [rows, setRows] = useState([]);
  const isOwner = user.role === "owner";

  useEffect(() => {
    api.get("/cash/closings", { params: range }).then((r) => setRows(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [range, refreshKey]);

  return (
    <div className="panel space-y-4 p-5" data-testid="cash-history">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-base font-bold uppercase tracking-tight">Riwayat Tutup Kasir {isOwner ? "(semua kasir)" : "(milik Anda)"}</h2>
        {isOwner && <ExportButton path="/export/closings" params={range} filename={`tutup-kasir_${range.start}_${range.end}.xlsx`} testid="cash-export-button" />}
      </div>
      <DateRange value={range} onChange={setRange} testid="cash-history-range" />
      <div className="overflow-x-auto rounded-md border">
        <Table className="zebra" data-testid="cash-history-table">
          <TableHeader>
            <TableRow className="bg-muted/70 hover:bg-muted/70">
              <TableHead>No</TableHead><TableHead>Waktu Tutup</TableHead><TableHead>Kasir</TableHead><TableHead className="text-right">Trx</TableHead>
              <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Kas Seharusnya</TableHead><TableHead className="text-right">Uang Fisik</TableHead>
              <TableHead className="text-right">Selisih</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Belum ada tutup kasir pada periode ini</TableCell></TableRow>}
            {rows.map((c) => (
              <TableRow key={c.id} data-testid={`cash-history-row-${c.number}`}>
                <TableCell className="font-mono text-xs">{c.number}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">{fmtDateTime(c.period_end)}</TableCell>
                <TableCell>{c.user_name}</TableCell>
                <TableCell className="text-right font-mono">{c.count}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{rp(c.total)}</TableCell>
                <TableCell className="text-right font-mono">{num(c.expected_cash)}</TableCell>
                <TableCell className="text-right font-mono">{num(c.counted_cash)}</TableCell>
                <TableCell className={`text-right font-mono font-bold ${diffCls(c.difference)}`}>{c.difference > 0 ? "+" : ""}{num(c.difference)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onView(c)} data-testid={`cash-history-view-${c.number}`}><Eye size={16} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => printHtml(closingHtml(c, settings), settings.paper_width, c.number)} data-testid={`cash-history-print-${c.number}`}><Printer size={16} /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
