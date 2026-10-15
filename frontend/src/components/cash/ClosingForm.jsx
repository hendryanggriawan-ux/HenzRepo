import { useCallback, useEffect, useState } from "react";
import { ArrowClockwise, LockKey } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/common";
import { api, errMsg } from "@/lib/api";
import { METHODS, fmtDateTime, num, rp } from "@/lib/format";

const Line = ({ label, value, testid, strong, tone = "" }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className={`text-sm ${strong ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
    <span className={`num ${strong ? "text-lg font-black" : "font-semibold"} ${tone}`} data-testid={testid}>{value}</span>
  </div>
);

const MoneyInput = ({ label, value, onChange, testid, autoFocus }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold">{label}</Label>
    <Input type="number" min="0" value={value} onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus} placeholder="0" className="h-11 text-right text-lg font-mono" data-testid={testid} />
  </div>
);

const diffTone = (d) => (d === 0 ? "text-emerald-600" : d > 0 ? "text-sky-600" : "text-destructive");
const diffLabel = (d) => (d === 0 ? "Pas" : d > 0 ? "Lebih" : "Kurang");

export const ClosingForm = ({ onClosed }) => {
  const [p, setP] = useState(null);
  const [opening, setOpening] = useState("");
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get("/cash/preview");
    setP(data);
  }, []);

  useEffect(() => {
    load().catch((e) => toast.error(errMsg(e)));
  }, [load]);

  const expected = (Number(opening) || 0) + (p?.cash_sales || 0);
  const diff = Math.round(((Number(counted) || 0) - expected) * 100) / 100;

  const submit = async () => {
    setSaving(true);
    try {
      const { data } = await api.post("/cash/close", { opening_cash: Number(opening) || 0, counted_cash: Number(counted) || 0, note });
      onClosed(data);
      setOpening("");
      setCounted("");
      setNote("");
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
      setConfirm(false);
    }
  };

  if (!p) return <div className="panel p-10 text-center text-muted-foreground">Memuat rekap...</div>;

  return (
    <div className="panel flex flex-col" data-testid="cash-close-form">
      <div className="flex items-start justify-between gap-3 border-b p-5">
        <div>
          <div className="eyebrow">Shift Berjalan</div>
          <div className="mt-1 text-sm text-muted-foreground" data-testid="cash-period">
            Sejak {fmtDateTime(p.period_start)} {p.last_closing ? `(tutup terakhir ${p.last_closing.number})` : "(awal hari ini)"}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => load()} title="Muat ulang" data-testid="cash-refresh-button"><ArrowClockwise size={18} /></Button>
      </div>
      <div className="grid grid-cols-2 gap-3 border-b p-5">
        <div className="rounded-md border p-3"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Transaksi</div><div className="text-2xl font-black num" data-testid="cash-count">{p.count}</div><div className="text-xs text-muted-foreground">{p.part_count} part · {p.service_count} servis</div></div>
        <div className="rounded-md border border-primary/50 p-3"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Penjualan</div><div className="text-2xl font-black num" data-testid="cash-total">{rp(p.total)}</div><div className="text-xs text-muted-foreground">Diskon {rp(p.discount)}</div></div>
      </div>
      <div className="border-b px-5 py-3">
        {METHODS.map((m) => <Line key={m.value} label={m.label} value={rp(p.by_method[m.value] || 0)} testid={`cash-method-${m.value}`} />)}
      </div>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <MoneyInput label="Modal Awal (kas awal laci)" value={opening} onChange={setOpening} testid="cash-opening-input" autoFocus />
          <MoneyInput label="Uang Fisik Dihitung *" value={counted} onChange={setCounted} testid="cash-counted-input" />
        </div>
        <div className="rounded-md bg-slate-950 px-4 py-3 text-white">
          <div className="flex justify-between text-sm text-slate-400"><span>Modal awal + penjualan tunai</span><span className="num">{rp(Number(opening) || 0)} + {rp(p.cash_sales)}</span></div>
          <div className="flex items-end justify-between pt-1"><span className="font-heading text-sm font-bold uppercase">Kas Seharusnya</span><span className="text-2xl font-black text-orange-400 num" data-testid="cash-expected">{rp(expected)}</span></div>
          {counted !== "" && (
            <div className="mt-2 flex items-end justify-between border-t border-slate-800 pt-2">
              <span className="font-heading text-sm font-bold uppercase">Selisih ({diffLabel(diff)})</span>
              <span className={`text-xl font-black num ${diffTone(diff)}`} data-testid="cash-difference">{diff > 0 ? "+" : ""}{num(diff)}</span>
            </div>
          )}
        </div>
        <div className="space-y-1.5"><Label className="text-xs font-semibold">Catatan</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: ambil kas untuk beli bensin 20rb" data-testid="cash-note-input" /></div>
        <Button onClick={() => setConfirm(true)} disabled={counted === "" || saving} className="tactile h-12 w-full font-heading text-base font-black uppercase" data-testid="cash-close-button">
          <LockKey size={20} weight="fill" className="mr-2" /> {saving ? "Menyimpan..." : "Tutup Kasir"}
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Tutup kasir sekarang?"
        description={`${p.count} transaksi senilai ${rp(p.total)} akan direkap. Transaksi berikutnya masuk ke shift baru.`}
        onConfirm={submit}
        confirmLabel="Ya, Tutup Kasir"
        testid="cash-close-confirm"
      />
    </div>
  );
};
