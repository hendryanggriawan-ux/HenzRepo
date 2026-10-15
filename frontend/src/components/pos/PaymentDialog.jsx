import { useEffect, useState } from "react";
import { Bank, CreditCard, Money, QrCode, Wallet } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/context/SettingsContext";
import { METHODS, num, rp } from "@/lib/format";

const ICONS = { tunai: Money, qris: QrCode, debit: CreditCard, kredit: Wallet, transfer: Bank };

const MethodGrid = ({ method, setMethod }) => (
  <div className="grid grid-cols-5 gap-2">
    {METHODS.map((m) => {
      const Icon = ICONS[m.value];
      const active = method === m.value;
      return (
        <button
          type="button"
          key={m.value}
          onClick={() => setMethod(m.value)}
          className={`tactile flex flex-col items-center gap-1 rounded-md border px-1 py-3 text-xs font-semibold ${
            active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/60"
          }`}
          data-testid={`payment-method-${m.value}`}
        >
          <Icon size={22} weight={active ? "fill" : "duotone"} />
          {m.label}
        </button>
      );
    })}
  </div>
);

const CashPanel = ({ total, paid, setPaid, onEnter }) => {
  const quick = [...new Set([total, Math.ceil(total / 10000) * 10000, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000])].filter((v) => v > 0);
  const change = (Number(paid) || 0) - total;
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Uang Diterima</Label>
        <Input type="number" min="0" autoFocus value={paid} onChange={(e) => setPaid(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onEnter()} className="h-12 text-right text-xl font-mono" data-testid="payment-paid-input" />
      </div>
      <div className="flex flex-wrap gap-2">
        {quick.map((v, i) => (
          <Button key={v} type="button" variant="outline" size="sm" onClick={() => setPaid(String(v))} data-testid={`payment-quick-${i}`}>
            {i === 0 ? "Uang Pas" : num(v)}
          </Button>
        ))}
      </div>
      <div className={`flex items-center justify-between rounded-md border px-4 py-3 ${change < 0 ? "border-destructive/50 bg-destructive/5" : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900"}`}>
        <span className="text-sm font-semibold">{change < 0 ? "Kurang" : "Kembalian"}</span>
        <span className="text-xl font-black num" data-testid="payment-change">{rp(Math.abs(change))}</span>
      </div>
    </div>
  );
};

const RefPanel = ({ method, refNo, setRef }) => {
  const { settings } = useSettings();
  return (
    <div className="space-y-3">
      {method === "qris" && (
        <div className="flex justify-center rounded-md border bg-white p-3" data-testid="payment-qris-box">
          {settings.qris_image ? (
            <img src={settings.qris_image} alt="QRIS toko" className="max-h-64 object-contain" data-testid="payment-qris-image" />
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">Gambar QRIS belum diatur. Unggah di menu Pengaturan.</p>
          )}
        </div>
      )}
      <div className="space-y-1.5">
        <Label>No. Referensi / Approval {method === "qris" ? "(opsional)" : ""}</Label>
        <Input value={refNo} onChange={(e) => setRef(e.target.value)} placeholder="Contoh: 123456" className="h-11 font-mono" data-testid="payment-ref-input" />
      </div>
    </div>
  );
};

export const PaymentDialog = ({ open, onOpenChange, subtotal, onSubmit, loading, title = "Pembayaran" }) => {
  const [method, setMethod] = useState("tunai");
  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState("");
  const [refNo, setRef] = useState("");

  useEffect(() => {
    if (open) {
      setMethod("tunai");
      setDiscount("");
      setPaid("");
      setRef("");
    }
  }, [open]);

  const disc = Number(discount) || 0;
  const total = Math.max(0, subtotal - disc);
  const paidNum = Number(paid) || 0;
  const canPay = !loading && disc <= subtotal && (method !== "tunai" || paidNum >= total);
  const submit = () => canPay && onSubmit({ method, ref: refNo, discount: disc, paid_amount: method === "tunai" ? paidNum : total });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="payment-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-tight">{title}</DialogTitle>
          <DialogDescription>Pilih metode pembayaran pelanggan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-slate-950 px-4 py-4 text-white">
            <div className="flex justify-between text-xs uppercase tracking-widest text-slate-400"><span>Subtotal</span><span className="num">{rp(subtotal)}</span></div>
            <div className="mt-1 flex items-end justify-between">
              <span className="font-heading text-sm font-bold uppercase">Total Bayar</span>
              <span className="text-3xl font-black text-orange-400 num" data-testid="payment-total">{rp(total)}</span>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            <div className="space-y-1.5">
              <Label>Diskon (Rp)</Label>
              <Input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="h-10 text-right font-mono" data-testid="payment-discount-input" />
            </div>
            {disc > subtotal && <span className="pb-2 text-xs text-destructive">Diskon melebihi subtotal</span>}
          </div>
          <MethodGrid method={method} setMethod={setMethod} />
          {method === "tunai" ? <CashPanel total={total} paid={paid} setPaid={setPaid} onEnter={submit} /> : <RefPanel method={method} refNo={refNo} setRef={setRef} />}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="payment-cancel-button">Batal</Button>
          <Button onClick={submit} disabled={!canPay} className="h-11 px-8 font-heading font-bold uppercase tracking-wide" data-testid="payment-submit-button">
            {loading ? "Memproses..." : "Proses Pembayaran"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
