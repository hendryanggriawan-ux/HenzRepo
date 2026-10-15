import { CheckCircle, Printer, WhatsappLogo } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/context/SettingsContext";
import { methodLabel, reminderText, rp, waLink } from "@/lib/format";
import { docHtml, printHtml, receiptHtml } from "@/lib/print";

const Info = ({ label, value, testid, strong }) => (
  <div className="flex items-center justify-between border-b py-2 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={`num ${strong ? "text-xl font-black" : "font-semibold"}`} data-testid={testid}>{value}</span>
  </div>
);

export const ReceiptDialog = ({ sale, onClose, title = "Transaksi Berhasil" }) => {
  const { settings } = useSettings();
  if (!sale) return null;
  const body = receiptHtml(sale, settings);
  const canWa = sale.type === "service" && sale.customer_phone && sale.next_service_date;
  const wide = settings.paper_width === "80";

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl" data-testid="receipt-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading uppercase tracking-tight">
            <CheckCircle size={24} weight="fill" className="text-emerald-500" /> {title}
          </DialogTitle>
          <DialogDescription>Struk siap dicetak ke printer thermal {settings.paper_width}mm.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <div className="panel px-4">
              <Info label="No. Transaksi" value={sale.number} testid="receipt-number" />
              <Info label="Metode" value={methodLabel(sale.payment_method)} testid="receipt-method" />
              <Info label="Total" value={rp(sale.total)} testid="receipt-total" strong />
              {sale.payment_method === "tunai" && <Info label="Kembalian" value={rp(sale.change)} testid="receipt-change" />}
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => printHtml(body, settings.paper_width, sale.number)} className="h-12 font-heading font-bold uppercase" data-testid="receipt-print-button">
                <Printer size={20} className="mr-2" /> Cetak Struk
              </Button>
              {canWa && (
                <Button asChild variant="outline" className="h-11 border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300">
                  <a href={waLink(sale.customer_phone, reminderText(settings, sale), settings.country_code)} target="_blank" rel="noreferrer" data-testid="receipt-wa-button">
                    <WhatsappLogo size={20} className="mr-2" /> Kirim Reminder Next Service
                  </a>
                </Button>
              )}
              <Button variant="ghost" onClick={onClose} data-testid="receipt-close-button">Selesai</Button>
            </div>
          </div>
          <iframe
            title="Preview struk"
            srcDoc={docHtml(body, settings.paper_width)}
            className="mx-auto rounded border bg-white"
            style={{ width: wide ? 316 : 234, height: 480 }}
            data-testid="receipt-preview-frame"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
