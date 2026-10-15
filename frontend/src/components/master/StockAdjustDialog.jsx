import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ItemPicker } from "@/components/pos/ItemPicker";
import { api, errMsg } from "@/lib/api";
import { num } from "@/lib/format";

export const StockAdjustDialog = ({ open, onOpenChange, onDone }) => {
  const [item, setItem] = useState(null);
  const [type, setType] = useState("in");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setItem(null);
      setType("in");
      setQty("1");
      setNote("");
    }
  }, [open]);

  const submit = async () => {
    setSaving(true);
    try {
      const { data } = await api.post("/stock/adjust", { item_id: item.id, type, qty: Number(qty), note });
      toast.success(`Stok ${data.name} sekarang ${num(data.stock_after)}`);
      onDone();
      setItem(null);
      setQty("1");
      setNote("");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="stock-adjust-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-tight">Barang Masuk / Keluar (Manual)</DialogTitle>
          <DialogDescription>Scan barcode barang, pilih jenis mutasi, lalu simpan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ItemPicker autoFocus onPick={setItem} testid="stock-adjust-picker" />
          {item && (
            <div className="rounded-md border bg-muted/50 p-3" data-testid="stock-adjust-selected">
              <div className="font-semibold">{item.name}</div>
              <div className="text-xs font-mono text-muted-foreground">{item.code} · stok saat ini {num(item.stock)} {item.unit}</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {[["in", "Barang Masuk"], ["out", "Barang Keluar"]].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setType(v)} className={`tactile rounded-md border py-3 text-sm font-semibold ${type === v ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`} data-testid={`stock-adjust-type-${v}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Jumlah</Label><Input type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} className="font-mono" data-testid="stock-adjust-qty" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Keterangan</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opname / rusak / retur" data-testid="stock-adjust-note" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          <Button onClick={submit} disabled={!item || !(Number(qty) > 0) || saving} data-testid="stock-adjust-submit">{saving ? "Menyimpan..." : "Simpan Mutasi"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
