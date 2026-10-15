import { useCallback, useEffect, useState } from "react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common";
import { useSettings } from "@/context/SettingsContext";
import { api, errMsg } from "@/lib/api";
import { daysBetween, fmtDate, fmtDateTime, reminderText, todayStr, vehicleName, waLink } from "@/lib/format";

const DueBadge = ({ date }) => {
  const d = daysBetween(todayStr(), date);
  const cls = d < 0 ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200" : d === 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200";
  const label = d < 0 ? `Terlambat ${-d} hari` : d === 0 ? "Hari ini" : `H-${d}`;
  return <span className={`rounded-sm px-2 py-0.5 text-xs font-bold ${cls}`}>{label}</span>;
};

export default function Reminder() {
  const { settings } = useSettings();
  const [days, setDays] = useState("-1");
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    const { data } = await api.get("/reminders", { params: { days } });
    setRows(data);
  }, [days]);

  useEffect(() => {
    load().catch((e) => toast.error(errMsg(e)));
  }, [load]);

  const markSent = async (v) => {
    try {
      const { data } = await api.post(`/reminders/${v.id}/sent`);
      setRows((rs) => rs.map((r) => (r.id === v.id ? data : r)));
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Operasional" title="Reminder Next Service" subtitle="Kirim pengingat servis via WhatsApp ke nomor yang tersimpan di data pelanggan" />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="panel space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="h-10 w-64" data-testid="reminder-days-filter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="-1">Sesuai pengaturan (H-{settings.reminder_days_ahead})</SelectItem>
                <SelectItem value="0">Hari ini & terlambat</SelectItem>
                <SelectItem value="7">7 hari ke depan</SelectItem>
                <SelectItem value="14">14 hari ke depan</SelectItem>
                <SelectItem value="30">30 hari ke depan</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground" data-testid="reminder-count">{rows.length} kendaraan</span>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <Table className="zebra" data-testid="reminder-table">
              <TableHeader>
                <TableRow className="bg-muted/70 hover:bg-muted/70">
                  <TableHead>No. Polisi</TableHead><TableHead>Kendaraan</TableHead><TableHead>Pelanggan</TableHead><TableHead>Servis Terakhir</TableHead>
                  <TableHead>Jadwal Berikutnya</TableHead><TableHead>Terkirim</TableHead><TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Tidak ada kendaraan yang jatuh tempo</TableCell></TableRow>}
                {rows.map((v) => (
                  <TableRow key={v.id} data-testid={`reminder-row-${v.plate_key}`}>
                    <TableCell className="font-black num">{v.plate}</TableCell>
                    <TableCell>{vehicleName(v)}</TableCell>
                    <TableCell>{v.customer_name}<span className="block font-mono text-xs text-muted-foreground">{v.customer_phone || "No. HP kosong"}</span></TableCell>
                    <TableCell className="text-sm">{fmtDate(v.last_service_date)}</TableCell>
                    <TableCell className="text-sm"><div>{fmtDate(v.next_service_date)}</div><DueBadge date={v.next_service_date} /></TableCell>
                    <TableCell className="text-xs" data-testid={`reminder-sent-${v.plate_key}`}>{v.reminder_sent_at ? fmtDateTime(v.reminder_sent_at) : "-"}</TableCell>
                    <TableCell className="text-right">
                      {v.customer_phone ? (
                        <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                          <a href={waLink(v.customer_phone, reminderText(settings, v), settings.country_code)} target="_blank" rel="noreferrer" onClick={() => markSent(v)} data-testid={`reminder-wa-${v.plate_key}`}>
                            <WhatsappLogo size={16} className="mr-1" /> Kirim WA
                          </a>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled>No. HP kosong</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="panel h-fit p-5" data-testid="reminder-template-preview">
          <div className="eyebrow mb-2">Contoh Pesan</div>
          <div className="whitespace-pre-line rounded-md bg-emerald-50 p-3 text-sm text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
            {reminderText(settings, { customer_name: "Budi", plate: "B 1234 XYZ", vehicle_desc: "Honda Vario 125", next_service_date: todayStr() })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Template pesan dapat diubah owner di menu Pengaturan. Tombol akan membuka WhatsApp Web / aplikasi dengan pesan terisi otomatis.</p>
        </div>
      </div>
    </div>
  );
}
