import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Coins, Package, Stack } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard } from "@/components/common";
import { ExportButton } from "@/components/common/ExportButton";
import { api, errMsg } from "@/lib/api";
import { num, rp, todayStr } from "@/lib/format";
import { PrintButton } from "./LaporanPenjualan";

const MODES = { all: "Semua Stok", low: "Stok Menipis", high: "Stok Masih Banyak" };

const StockTable = ({ rows }) => (
  <div className="overflow-x-auto rounded-md border">
    <Table className="zebra" data-testid="stock-report-table">
      <TableHeader>
        <TableRow className="bg-muted/70 hover:bg-muted/70">
          <TableHead>Kode</TableHead><TableHead>Nama Barang</TableHead><TableHead>Kategori</TableHead><TableHead className="text-right">Stok</TableHead>
          <TableHead className="text-right">Min</TableHead><TableHead className="text-right">Hrg Beli</TableHead><TableHead className="text-right">Hrg Jual</TableHead><TableHead className="text-right">Nilai Stok</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Tidak ada barang</TableCell></TableRow>}
        {rows.map((i) => (
          <TableRow key={i.id} data-testid={`stock-report-row-${i.code}`}>
            <TableCell className="font-mono text-xs">{i.code}</TableCell>
            <TableCell className="font-medium">{i.name}</TableCell>
            <TableCell>{i.category || "-"}</TableCell>
            <TableCell className="text-right font-mono font-bold">{num(i.stock)} <span className="text-xs font-normal text-muted-foreground">{i.unit}</span></TableCell>
            <TableCell className="text-right font-mono text-muted-foreground">{num(i.min_stock)}</TableCell>
            <TableCell className="text-right font-mono">{num(i.buy_price)}</TableCell>
            <TableCell className="text-right font-mono">{num(i.sell_price)}</TableCell>
            <TableCell className="text-right font-mono font-semibold">{num(i.stock * i.buy_price)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default function LaporanStok() {
  const [params, setParams] = useSearchParams();
  const mode = MODES[params.get("mode")] ? params.get("mode") : "all";
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/reports/stock", { params: { mode } }).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [mode]);

  const hint = data ? (mode === "low" ? `Stok ≤ stok minimum barang (atau ≤ ${data.low_threshold} bila minimum kosong)` : mode === "high" ? `Stok ≥ ${data.high_threshold}` : "Seluruh barang") : "";
  return (
    <div>
      <PageHeader eyebrow="Laporan" title="Laporan Stok Barang" subtitle={`${MODES[mode]} · ${hint}`} actions={<><ExportButton path="/export/stock" params={{ mode }} filename={`laporan-stok-${mode}_${todayStr()}.xlsx`} /><PrintButton /></>} />
      <Tabs value={mode} onValueChange={(v) => setParams({ mode: v })} className="mb-4 no-print">
        <TabsList className="h-11">
          {Object.entries(MODES).map(([k, l]) => <TabsTrigger key={k} value={k} className="h-9 px-4 font-semibold" data-testid={`stock-report-tab-${k}`}>{l}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      {data && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard accent label="Jumlah Barang" value={data.summary.count} icon={Package} testid="stock-report-count" />
            <StatCard label="Total Qty" value={num(data.summary.qty)} icon={Stack} testid="stock-report-qty" />
            <StatCard label="Nilai Stok (Hrg Beli)" value={rp(data.summary.value)} sub={`Nilai jual ${rp(data.summary.sell_value)}`} icon={Coins} testid="stock-report-value" />
          </div>
          <StockTable rows={data.rows} />
        </div>
      )}
    </div>
  );
}
