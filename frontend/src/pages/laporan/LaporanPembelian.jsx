import { useEffect, useState } from "react";
import { Factory, Package, ShoppingCart } from "@phosphor-icons/react";
import { toast } from "sonner";
import { DateRange, PageHeader, StatCard } from "@/components/common";
import { ExportButton } from "@/components/common/ExportButton";
import { PurchaseDetail, PurchaseTable } from "@/components/purchase/PurchaseHistory";
import { useRange } from "@/hooks/useRange";
import { api, errMsg } from "@/lib/api";
import { num, rp } from "@/lib/format";
import { PrintButton } from "./LaporanPenjualan";

export default function LaporanPembelian() {
  const [range, setRange] = useRange();
  const [data, setData] = useState(null);
  const [view, setView] = useState(null);

  useEffect(() => {
    api.get("/reports/purchases", { params: range }).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [range]);

  const s = data?.summary;
  const suppliers = s ? Object.entries(s.by_supplier) : [];
  return (
    <div>
      <PageHeader eyebrow="Laporan" title="Laporan Pembelian" subtitle={`Periode ${range.start} s/d ${range.end}`} actions={<><ExportButton path="/export/purchases" params={range} filename={`laporan-pembelian_${range.start}_${range.end}.xlsx`} /><PrintButton /></>} />
      <div className="mb-4"><DateRange value={range} onChange={setRange} testid="purchase-report-range" /></div>
      {s && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard accent label="Total Pembelian" value={rp(s.total)} sub={`${s.count} faktur`} icon={ShoppingCart} testid="purchase-report-total" />
            <StatCard label="Qty Barang Masuk" value={num(s.items_qty)} icon={Package} testid="purchase-report-qty" />
            <StatCard label="Supplier" value={suppliers.length} sub={suppliers.slice(0, 3).map(([n, t]) => `${n}: ${rp(t)}`).join(" · ") || "-"} icon={Factory} testid="purchase-report-suppliers" />
          </div>
          <PurchaseTable rows={data.rows} onView={setView} />
        </div>
      )}
      <PurchaseDetail purchase={view} onClose={() => setView(null)} />
    </div>
  );
}
