import { useEffect, useState } from "react";
import { Eye } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange } from "@/components/common";
import { LinesTable } from "@/components/pos/LinesTable";
import { useRange } from "@/hooks/useRange";
import { api, errMsg } from "@/lib/api";
import { fmtDate, fmtDateTime, rp } from "@/lib/format";

export const PurchaseTable = ({ rows, onView }) => (
  <div className="overflow-x-auto rounded-md border">
    <Table className="zebra" data-testid="purchase-table">
      <TableHeader>
        <TableRow className="bg-muted/70 hover:bg-muted/70">
          <TableHead>No</TableHead><TableHead>Input</TableHead><TableHead>Tgl Faktur</TableHead><TableHead>Supplier</TableHead><TableHead>No. Faktur</TableHead>
          <TableHead className="text-right">Item</TableHead><TableHead className="text-right">Total</TableHead><TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Belum ada pembelian pada periode ini</TableCell></TableRow>}
        {rows.map((p) => (
          <TableRow key={p.id} data-testid={`purchase-row-${p.number}`}>
            <TableCell className="font-mono text-xs">{p.number}</TableCell>
            <TableCell className="text-sm">{fmtDateTime(p.created_at)}</TableCell>
            <TableCell className="text-sm">{fmtDate(p.date)}</TableCell>
            <TableCell>{p.supplier_name}</TableCell>
            <TableCell className="font-mono text-xs">{p.invoice_no || "-"}</TableCell>
            <TableCell className="text-right font-mono">{p.items.length}</TableCell>
            <TableCell className="text-right font-mono font-semibold">{rp(p.total)}</TableCell>
            <TableCell><Button variant="ghost" size="icon" onClick={() => onView(p)} data-testid={`purchase-view-${p.number}`}><Eye size={16} /></Button></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export const PurchaseDetail = ({ purchase, onClose }) => (
  <Dialog open={Boolean(purchase)} onOpenChange={(v) => !v && onClose()}>
    <DialogContent className="max-w-3xl" data-testid="purchase-detail-dialog">
      <DialogHeader>
        <DialogTitle className="font-heading uppercase">Pembelian {purchase?.number}</DialogTitle>
        <DialogDescription>{purchase?.supplier_name} · Faktur {purchase?.invoice_no || "-"} · oleh {purchase?.created_by}</DialogDescription>
      </DialogHeader>
      {purchase && <LinesTable lines={purchase.items} testid="purchase-detail-lines" />}
      {purchase && <div className="text-right text-xl font-black num">{rp(purchase.total)}</div>}
    </DialogContent>
  </Dialog>
);

export const PurchaseHistory = () => {
  const [range, setRange] = useRange();
  const [rows, setRows] = useState([]);
  const [view, setView] = useState(null);

  useEffect(() => {
    api.get("/purchases", { params: range }).then((r) => setRows(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [range]);

  return (
    <div className="panel space-y-4 p-4">
      <DateRange value={range} onChange={setRange} testid="purchase-range" />
      <PurchaseTable rows={rows} onView={setView} />
      <PurchaseDetail purchase={view} onClose={() => setView(null)} />
    </div>
  );
};
