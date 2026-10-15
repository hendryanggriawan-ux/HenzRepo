import { LockKey, Printer } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/context/SettingsContext";
import { num, rp } from "@/lib/format";
import { closingHtml, docHtml, printHtml } from "@/lib/print";

const Info = ({ label, value, testid, strong }) => (
  <div className="flex items-center justify-between border-b py-2 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={`num ${strong ? "text-xl font-black" : "font-semibold"}`} data-testid={testid}>{value}</span>
  </div>
);

export const ClosingDialog = ({ closing, onClose }) => {
  const { settings } = useSettings();
  if (!closing) return null;
  const body = closingHtml(closing, settings);
  const wide = settings.paper_width === "80";
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl" data-testid="cash-closing-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading uppercase tracking-tight"><LockKey size={22} weight="fill" className="text-primary" /> Tutup Kasir {closing.number}</DialogTitle>
          <DialogDescription>Kasir {closing.user_name} · cetak ke printer thermal {settings.paper_width}mm.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <div className="panel px-4">
              <Info label="Transaksi" value={closing.count} testid="cash-closing-count" />
              <Info label="Total Penjualan" value={rp(closing.total)} testid="cash-closing-total" strong />
              <Info label="Kas Seharusnya" value={rp(closing.expected_cash)} testid="cash-closing-expected" />
              <Info label="Uang Fisik" value={rp(closing.counted_cash)} />
              <Info label="Selisih" value={`${closing.difference > 0 ? "+" : ""}${num(closing.difference)}`} testid="cash-closing-difference" />
            </div>
            <Button onClick={() => printHtml(body, settings.paper_width, closing.number)} className="h-12 w-full font-heading font-bold uppercase" data-testid="cash-closing-print-button">
              <Printer size={20} className="mr-2" /> Cetak Laporan Tutup Kasir
            </Button>
            <Button variant="ghost" onClick={onClose} className="w-full" data-testid="cash-closing-close-button">Tutup</Button>
          </div>
          <iframe title="Preview tutup kasir" srcDoc={docHtml(body, settings.paper_width)} className="mx-auto rounded border bg-white" style={{ width: wide ? 316 : 234, height: 480 }} data-testid="cash-closing-preview-frame" />
        </div>
      </DialogContent>
    </Dialog>
  );
};
