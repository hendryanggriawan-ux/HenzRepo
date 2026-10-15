import { useEffect, useState } from "react";
import { ChartLineUp, Coins, Printer, Receipt, Wrench } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRange, PageHeader, StatCard } from "@/components/common";
import { ExportButton } from "@/components/common/ExportButton";
import { ReceiptDialog } from "@/components/pos/ReceiptDialog";
import { SalesTable } from "@/pages/Riwayat";
import { useRange } from "@/hooks/useRange";
import { api, errMsg } from "@/lib/api";
import { METHODS, rp } from "@/lib/format";

export const PrintButton = () => (
  <Button variant="outline" onClick={() => window.print()} data-testid="report-print-button"><Printer size={16} className="mr-1.5" /> Cetak Laporan</Button>
);

export default function LaporanPenjualan() {
  const [range, setRange] = useRange();
  const [type, setType] = useState("all");
  const [data, setData] = useState(null);
  const [view, setView] = useState(null);

  useEffect(() => {
    api.get("/reports/sales", { params: { ...range, type: type === "all" ? "" : type } }).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [range, type]);

  const s = data?.summary;
  return (
    <div>
      <PageHeader
        eyebrow="Laporan"
        title="Laporan Penjualan"
        subtitle={`Periode ${range.start} s/d ${range.end}`}
        actions={
          <>
            <ExportButton path="/export/sales" params={{ ...range, type: type === "all" ? "" : type }} filename={`laporan-penjualan_${range.start}_${range.end}.xlsx`} />
            <PrintButton />
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <DateRange value={range} onChange={setRange} testid="sales-report-range" />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-10 w-44 no-print" data-testid="sales-report-type"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Semua jenis</SelectItem><SelectItem value="part">Penjualan Part</SelectItem><SelectItem value="service">Servis</SelectItem></SelectContent>
        </Select>
      </div>
      {s && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard accent label="Total Penjualan" value={rp(s.total)} sub={`${s.count} transaksi · diskon ${rp(s.discount)}`} icon={Coins} testid="sales-report-total" />
            <StatCard label="Penjualan Part" value={rp(s.parts_total)} sub={`HPP ${rp(s.cost_total)}`} icon={Receipt} testid="sales-report-parts" />
            <StatCard label="Pendapatan Jasa" value={rp(s.services_total)} sub={`${s.service_count} servis`} icon={Wrench} testid="sales-report-services" />
            <StatCard label="Laba Kotor" value={rp(s.gross_profit)} sub="Part − HPP + jasa − diskon" icon={ChartLineUp} testid="sales-report-profit" />
          </div>
          <div className="panel grid grid-cols-2 gap-3 p-4 sm:grid-cols-5" data-testid="sales-report-methods">
            {METHODS.map((m) => (
              <div key={m.value} className="rounded-md border p-3">
                <div className="text-[11px] font-heading font-bold uppercase tracking-wider text-muted-foreground">{m.label}</div>
                <div className="mt-1 text-lg font-black num" data-testid={`sales-report-method-${m.value}`}>{rp(s.by_method[m.value] || 0)}</div>
              </div>
            ))}
          </div>
          <SalesTable rows={data.rows} onView={setView} testid="sales-report-table" />
        </div>
      )}
      <ReceiptDialog sale={view} onClose={() => setView(null)} title={`Detail ${view?.number || ""}`} />
    </div>
  );
}
