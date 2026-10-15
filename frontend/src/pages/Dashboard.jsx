import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CashRegister, Coins, Motorcycle, Package, Receipt, Truck, WhatsappLogo, Wrench } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard } from "@/components/common";
import { api } from "@/lib/api";
import { fmtDateTime, methodLabel, num, rp } from "@/lib/format";

const shortDay = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "2-digit" });

const SalesChart = ({ series }) => (
  <div className="panel p-5 lg:col-span-2" data-testid="dashboard-chart">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-heading text-base font-bold uppercase tracking-tight">Penjualan 7 Hari</h2>
      <span className="text-xs text-muted-foreground">Total {rp(series.reduce((s, x) => s + x.total, 0))}</span>
    </div>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series.map((s) => ({ ...s, label: shortDay(s.date) }))}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tickFormatter={(v) => (v >= 1000000 ? `${v / 1000000}jt` : v >= 1000 ? `${v / 1000}rb` : v)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={48} />
          <Tooltip formatter={(v) => rp(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }} />
          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const LowStock = ({ items, count }) => (
  <div className="panel p-5" data-testid="dashboard-low-stock">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-heading text-base font-bold uppercase tracking-tight">Stok Menipis</h2>
      <Link to="/laporan/stok?mode=low" className="text-xs font-semibold text-primary hover:underline" data-testid="dashboard-low-stock-link">Lihat {count}</Link>
    </div>
    <div className="space-y-2">
      {items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Semua stok aman</p>}
      {items.map((i) => (
        <div key={i.id} className="flex items-center justify-between rounded-md border px-3 py-2">
          <div className="min-w-0"><div className="truncate text-sm font-medium">{i.name}</div><div className="text-[11px] font-mono text-muted-foreground">{i.code}</div></div>
          <span className="rounded-sm bg-red-100 px-2 py-0.5 text-sm font-black text-red-700 num dark:bg-red-950 dark:text-red-200">{num(i.stock)}</span>
        </div>
      ))}
    </div>
  </div>
);

const Recent = ({ rows }) => (
  <div className="panel p-5 lg:col-span-3" data-testid="dashboard-recent">
    <h2 className="mb-3 font-heading text-base font-bold uppercase tracking-tight">Transaksi Terakhir</h2>
    <div className="overflow-x-auto rounded-md border">
      <Table className="zebra">
        <TableHeader><TableRow className="bg-muted/70 hover:bg-muted/70"><TableHead>No</TableHead><TableHead>Waktu</TableHead><TableHead>Jenis</TableHead><TableHead>Pelanggan / Plat</TableHead><TableHead>Metode</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Belum ada transaksi</TableCell></TableRow>}
          {rows.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-mono text-xs">{s.number}</TableCell>
              <TableCell className="text-sm">{fmtDateTime(s.created_at)}</TableCell>
              <TableCell>{s.type === "service" ? "Servis" : "Part"}</TableCell>
              <TableCell>{s.plate || s.customer_name || "Umum"}</TableCell>
              <TableCell>{methodLabel(s.payment_method)}</TableCell>
              <TableCell className="text-right font-mono font-semibold">{rp(s.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </div>
);

export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => {
    api.get("/reports/dashboard").then((r) => setD(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Ringkasan"
        title="Dashboard Owner"
        subtitle="Kondisi bengkel hari ini"
        actions={
          <>
            <Button asChild variant="outline"><Link to="/penerimaan" data-testid="dashboard-quick-penerimaan"><Motorcycle size={16} className="mr-1.5" /> Terima Kendaraan</Link></Button>
            <Button asChild variant="outline"><Link to="/pembelian" data-testid="dashboard-quick-pembelian"><Truck size={16} className="mr-1.5" /> Pembelian</Link></Button>
            <Button asChild><Link to="/kasir" data-testid="dashboard-quick-kasir"><CashRegister size={16} className="mr-1.5" /> Buka Kasir</Link></Button>
          </>
        }
      />
      {!d ? (
        <div className="py-20 text-center text-muted-foreground" data-testid="dashboard-loading">Memuat data...</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3 xl:grid-cols-6">
            <div className="sm:col-span-2"><StatCard accent label="Penjualan Hari Ini" value={rp(d.today.total)} sub={`${d.today.count} transaksi`} icon={Coins} testid="stat-today-sales" /></div>
            <StatCard label="Laba Kotor" value={rp(d.today.gross_profit)} sub="Part + jasa − HPP − diskon" icon={Receipt} testid="stat-today-profit" />
            <StatCard label="Servis Aktif" value={d.active_work_orders} sub="Belum dibayar" icon={Wrench} testid="stat-active-wo" />
            <StatCard label="Stok Menipis" value={d.low_stock_count} sub="Perlu restock" icon={Package} testid="stat-low-stock" />
            <StatCard label="Reminder" value={d.due_reminders} sub="Jatuh tempo servis" icon={WhatsappLogo} testid="stat-due-reminders" />
          </div>
          <SalesChart series={d.series} />
          <LowStock items={d.low_stock} count={d.low_stock_count} />
          <Recent rows={d.recent_sales} />
        </div>
      )}
    </div>
  );
}
