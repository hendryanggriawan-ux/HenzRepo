import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange, PageHeader } from "@/components/common";
import { ExportButton } from "@/components/common/ExportButton";
import { useRange } from "@/hooks/useRange";
import { api, errMsg } from "@/lib/api";
import { fmtDateTime, num } from "@/lib/format";
import { PrintButton } from "./LaporanPenjualan";

export default function LaporanMutasi() {
  const [range, setRange] = useRange();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/stock/moves", { params: { ...range, q } }).then((r) => setRows(r.data)).catch((e) => toast.error(errMsg(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [range, q]);

  return (
    <div>
      <PageHeader eyebrow="Laporan" title="Mutasi Stok" subtitle="Riwayat barang masuk & keluar (pembelian, penjualan, servis, manual)" actions={<><ExportButton path="/export/moves" params={{ ...range, q }} filename={`mutasi-stok_${range.start}_${range.end}.xlsx`} /><PrintButton /></>} />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <DateRange value={range} onChange={setRange} testid="moves-range" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari barang / kode / referensi" className="h-10 max-w-xs no-print" data-testid="moves-search" />
      </div>
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table className="zebra" data-testid="moves-table">
          <TableHeader>
            <TableRow className="bg-muted/70 hover:bg-muted/70">
              <TableHead>Waktu</TableHead><TableHead>Kode</TableHead><TableHead>Barang</TableHead><TableHead>Jenis</TableHead>
              <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Stok Akhir</TableHead><TableHead>Referensi</TableHead><TableHead>Keterangan</TableHead><TableHead>User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Tidak ada mutasi pada periode ini</TableCell></TableRow>}
            {rows.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="whitespace-nowrap text-sm">{fmtDateTime(m.created_at)}</TableCell>
                <TableCell className="font-mono text-xs">{m.code}</TableCell>
                <TableCell>{m.name}</TableCell>
                <TableCell>
                  <span className={`rounded-sm px-2 py-0.5 text-xs font-bold ${m.type === "in" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200"}`}>
                    {m.type === "in" ? "MASUK" : "KELUAR"}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono font-bold">{m.type === "in" ? "+" : "−"}{num(m.qty)}</TableCell>
                <TableCell className="text-right font-mono">{num(m.stock_after)}</TableCell>
                <TableCell className="font-mono text-xs">{m.ref || "-"}</TableCell>
                <TableCell className="text-sm">{m.note || "-"}</TableCell>
                <TableCell className="text-sm">{m.user}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
