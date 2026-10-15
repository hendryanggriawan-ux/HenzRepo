import { useEffect, useState } from "react";
import { Barcode, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ItemPicker } from "@/components/pos/ItemPicker";
import { LinesTable } from "@/components/pos/LinesTable";
import { BarcodePrintDialog } from "@/components/master/BarcodePrintDialog";
import { api, errMsg } from "@/lib/api";
import { linesTotal, rp, todayStr } from "@/lib/format";

const addLine = (lines, item) => {
  const idx = lines.findIndex((l) => l.item_id === item.id);
  if (idx >= 0) return lines.map((l, i) => (i === idx ? { ...l, qty: (Number(l.qty) || 0) + 1 } : l));
  return [...lines, { item_id: item.id, code: item.code, name: item.name, qty: 1, price: item.buy_price, sell_price: item.sell_price }];
};

const SavedDialog = ({ purchase, onClose }) => {
  const [labels, setLabels] = useState(false);
  const items = purchase ? purchase.items.map((l) => ({ id: l.item_id, code: l.code, name: l.name, sell_price: l.sell_price, qty: l.qty })) : [];
  return (
    <>
      <Dialog open={Boolean(purchase) && !labels} onOpenChange={(v) => !v && onClose()}>
        <DialogContent data-testid="purchase-saved-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading uppercase"><CheckCircle size={24} weight="fill" className="text-emerald-500" /> Pembelian Tersimpan</DialogTitle>
            <DialogDescription>Stok barang sudah bertambah otomatis.</DialogDescription>
          </DialogHeader>
          {purchase && (
            <div className="rounded-md border p-4">
              <div className="font-mono text-xs text-muted-foreground" data-testid="purchase-saved-number">{purchase.number}</div>
              <div className="font-semibold">{purchase.supplier_name}</div>
              <div className="text-lg font-black num">{rp(purchase.total)}</div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose}>Tutup</Button>
            <Button onClick={() => setLabels(true)} data-testid="purchase-print-labels-button"><Barcode size={18} className="mr-1.5" /> Cetak Label Barcode</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BarcodePrintDialog open={labels} onOpenChange={(v) => { setLabels(v); if (!v) onClose(); }} items={items} defaultCopies={(i) => i.qty} />
    </>
  );
};

export const PurchaseForm = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [f, setF] = useState({ supplier_id: "", invoice_no: "", date: todayStr(), note: "" });
  const [lines, setLines] = useState([]);
  const [updateBuy, setUpdateBuy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    api.get("/suppliers").then((r) => setSuppliers(r.data)).catch(() => {});
  }, []);

  const submit = async () => {
    if (!f.supplier_id) return toast.error("Pilih supplier terlebih dahulu");
    setSaving(true);
    try {
      const { data } = await api.post("/purchases", { ...f, update_buy_price: updateBuy, items: lines.map((l) => ({ item_id: l.item_id, qty: Number(l.qty), price: Number(l.price) || 0 })) });
      const sellMap = Object.fromEntries(lines.map((l) => [l.item_id, l.sell_price]));
      setSaved({ ...data, items: data.items.map((i) => ({ ...i, sell_price: sellMap[i.item_id] })) });
      setLines([]);
      setF({ supplier_id: f.supplier_id, invoice_no: "", date: todayStr(), note: "" });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  const valid = lines.length > 0 && lines.every((l) => Number(l.qty) > 0);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="panel space-y-4 p-5">
        <div className="eyebrow">Barang Masuk (scan barcode)</div>
        <ItemPicker autoFocus priceKey="buy_price" onPick={(item) => setLines(addLine(lines, item))} testid="purchase-picker" />
        <LinesTable lines={lines} onChange={setLines} priceEditable testid="purchase-lines" empty="Scan barcode barang yang diterima dari supplier" />
      </div>
      <div className="panel flex flex-col gap-4 p-5">
        <div className="eyebrow">Data Pembelian</div>
        <div className="space-y-1.5">
          <Label className="text-xs">Supplier / Distributor *</Label>
          <Select value={f.supplier_id} onValueChange={(v) => setF({ ...f, supplier_id: v })}>
            <SelectTrigger className="h-10" data-testid="purchase-supplier-select"><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
            <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label className="text-xs">No. Faktur Supplier</Label><Input value={f.invoice_no} onChange={(e) => setF({ ...f, invoice_no: e.target.value })} className="font-mono" data-testid="purchase-invoice-input" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Tanggal Faktur</Label><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} data-testid="purchase-date-input" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Catatan</Label><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} data-testid="purchase-note-input" /></div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={updateBuy} onCheckedChange={(v) => setUpdateBuy(Boolean(v))} data-testid="purchase-update-buy-checkbox" /> Perbarui harga beli barang
        </label>
        <div className="mt-auto flex items-end justify-between border-t pt-3">
          <span className="font-heading text-sm font-bold uppercase">Total</span>
          <span className="text-2xl font-black num" data-testid="purchase-total">{rp(linesTotal(lines))}</span>
        </div>
        <Button onClick={submit} disabled={!valid || saving} className="tactile h-12 font-heading font-black uppercase" data-testid="purchase-save-button">
          {saving ? "Menyimpan..." : "Simpan Pembelian"}
        </Button>
      </div>
      <SavedDialog purchase={saved} onClose={() => setSaved(null)} />
    </div>
  );
};
