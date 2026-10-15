import { useEffect, useRef, useState } from "react";
import { Printer } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/context/SettingsContext";
import { rp } from "@/lib/format";
import { barcodeSvg, labelsHtml, printHtml } from "@/lib/print";

export const BarcodePreview = ({ code, testid = "barcode-preview" }) => (
  <div className="flex justify-center rounded-md border bg-white p-3" data-testid={testid} dangerouslySetInnerHTML={{ __html: barcodeSvg(code, { width: 1.8, height: 50 }) }} />
);

export const BarcodePrintDialog = ({ open, onOpenChange, items, defaultCopies = () => 1 }) => {
  const { settings } = useSettings();
  const [copies, setCopies] = useState({});
  const init = useRef(null);
  init.current = () => Object.fromEntries(items.map((i) => [i.id, defaultCopies(i)]));

  useEffect(() => {
    if (open) {
      setCopies(init.current());
    }
  }, [open]);

  const entries = items.map((item) => ({ item, copies: copies[item.id] ?? 1 }));
  const totalLabels = entries.reduce((s, e) => s + (Number(e.copies) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="barcode-print-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-tight">Cetak Label Barcode</DialogTitle>
          <DialogDescription>Atur jumlah label per barang. Dicetak ke printer thermal {settings.paper_width}mm.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_180px_90px] items-center gap-3 rounded-md border p-2" data-testid={`barcode-print-row-${item.code}`}>
              <div className="min-w-0">
                <div className="truncate font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{item.code} · {rp(item.sell_price)}</div>
              </div>
              <div className="flex justify-center bg-white p-1" dangerouslySetInnerHTML={{ __html: barcodeSvg(item.code, { height: 28, fontSize: 10 }) }} />
              <Input type="number" min="0" value={copies[item.id] ?? 1} onChange={(e) => setCopies({ ...copies, [item.id]: e.target.value })} className="h-9 text-right font-mono" data-testid={`barcode-print-copies-${item.code}`} />
            </div>
          ))}
        </div>
        <DialogFooter className="items-center gap-2">
          <span className="mr-auto text-sm text-muted-foreground" data-testid="barcode-print-total">{totalLabels} label</span>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          <Button onClick={() => printHtml(labelsHtml(entries, settings), settings.paper_width, "Label Barcode")} disabled={!totalLabels} data-testid="barcode-print-submit">
            <Printer size={18} className="mr-1.5" /> Cetak {totalLabels} Label
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
