import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const CameraScanner = ({ open, onClose, onDetected }) => {
  const [error, setError] = useState("");
  const cb = useRef(onDetected);
  cb.current = onDetected;

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    setError("");
    let scanner = null;
    let done = false;
    const timer = setTimeout(async () => {
      try {
        scanner = new Html5Qrcode("camera-scan-region", { verbose: false });
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 130 } },
          (text) => {
            if (done) return;
            done = true;
            scanner.stop().catch(() => {}).finally(() => cb.current(text));
          },
          () => {},
        );
      } catch {
        setError("Kamera tidak dapat diakses. Izinkan akses kamera dan buka aplikasi via HTTPS atau localhost.");
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      done = true;
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md" data-testid="camera-scanner-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase">Scan Barcode via Kamera</DialogTitle>
          <DialogDescription>Arahkan kamera ke barcode barang. Scanner USB juga bisa langsung dipakai di kolom input.</DialogDescription>
        </DialogHeader>
        <div id="camera-scan-region" className="w-full min-h-[240px] overflow-hidden rounded-md bg-slate-950" />
        {error && <p className="text-sm text-destructive" data-testid="camera-scanner-error">{error}</p>}
      </DialogContent>
    </Dialog>
  );
};
