import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange, PageHeader } from "@/components/common";
import { ExportButton } from "@/components/common/ExportButton";
import { useRange } from "@/hooks/useRange";
import { api, errMsg } from "@/lib/api";
import { fmtDateTime, rp } from "@/lib/format";
import { PrintButton } from "./LaporanPenjualan";

const MechanicCards = ({ summary }) => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="mechanic-report-summary">
    {summary.map((m) => (
      <div key={m.mechanic_id} className="panel relative overflow-hidden p-5" data-testid={`mechanic-card-${m.mechanic_id}`}>
        <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
        <div className="font-heading font-black uppercase tracking-tight">{m.mechanic_name}</div>
        <div className="mt-3 text-2xl font-black num" data-testid={`mechanic-card-services-${m.mechanic_id}`}>{rp(m.services_total)}</div>
        <div className="text-xs text-muted-foreground">Pendapatan jasa</div>
        <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs">
          <div><div className="text-lg font-black num" data-testid={`mechanic-card-jobs-${m.mechanic_id}`}>{m.jobs}</div>Selesai</div>
          <div><div className="text-lg font-black num">{m.active_jobs}</div>Aktif</div>
          <div><div className="text-sm font-bold num">{rp(m.parts_total)}</div>Part</div>
        </div>
      </div>
    ))}
  </div>
);

const JobsTable = ({ jobs }) => (
  <div className="overflow-x-auto rounded-md border">
    <Table className="zebra" data-testid="mechanic-report-table">
      <TableHeader>
        <TableRow className="bg-muted/70 hover:bg-muted/70">
          <TableHead>Waktu</TableHead><TableHead>No. WO</TableHead><TableHead>No. Polisi</TableHead><TableHead>Pelanggan</TableHead><TableHead>Mekanik</TableHead>
          <TableHead>Jasa</TableHead><TableHead className="text-right">Jasa (Rp)</TableHead><TableHead className="text-right">Part (Rp)</TableHead><TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.length === 0 && <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Belum ada servis dibayar pada periode ini</TableCell></TableRow>}
        {jobs.map((j) => (
          <TableRow key={j.id} data-testid={`mechanic-job-${j.work_order_number}`}>
            <TableCell className="whitespace-nowrap text-sm">{fmtDateTime(j.created_at)}</TableCell>
            <TableCell className="font-mono text-xs">{j.work_order_number}</TableCell>
            <TableCell className="font-black num">{j.plate}</TableCell>
            <TableCell>{j.customer_name}</TableCell>
            <TableCell className="font-semibold">{j.mechanic_name}</TableCell>
            <TableCell className="text-sm">{j.services.join(", ") || "-"}</TableCell>
            <TableCell className="text-right font-mono">{rp(j.services_total)}</TableCell>
            <TableCell className="text-right font-mono">{rp(j.parts_total)}</TableCell>
            <TableCell className="text-right font-mono font-semibold">{rp(j.total)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default function LaporanMekanik() {
  const [range, setRange] = useRange();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/reports/mechanics", { params: range }).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [range]);

  return (
    <div>
      <PageHeader eyebrow="Laporan" title="Laporan Jasa Mekanik" subtitle={`Pekerjaan per mekanik · ${range.start} s/d ${range.end}`} actions={<><ExportButton path="/export/mechanics" params={range} filename={`laporan-jasa-mekanik_${range.start}_${range.end}.xlsx`} /><PrintButton /></>} />
      <div className="mb-4"><DateRange value={range} onChange={setRange} testid="mechanic-report-range" /></div>
      {data && (
        <div className="space-y-4">
          <MechanicCards summary={data.summary} />
          <JobsTable jobs={data.jobs} />
        </div>
      )}
    </div>
  );
}
