import { useEffect, useState } from "react";
import { MicrosoftExcelLogo } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButton } from "@/components/common/ExportButton";
import { api, errMsg } from "@/lib/api";

const BADGE = {
  baru: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  update: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  error: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
};
const LABEL = { baru: "Baru", update: "Diperbarui", error: "Error" };

const Summary = ({ r }) => (
  <div className="grid grid-cols-3 gap-2" data-testid="item-import-summary">
    {[["baru", r.created], ["update", r.updated], ["error", r.errors]].map(([k, v]) => (
      <div key={k} className={`rounded-md px-3 py-2 ${BADGE[k]}`}>
        <div className="text-[11px] font-bold uppercase tracking-wider">{LABEL[k]}</div>
        <div className="text-2xl font-black num" data-testid={`item-import-count-${k}`}>{v}</div>
      </div>
    ))}
  </div>
);

const ResultTable = ({ rows }) => (
  <div className="max-h-64 overflow-auto rounded-md border">
    <Table className="zebra" data-testid="item-import-table">
      <TableHeader>
        <TableRow className="bg-muted/70 hover:bg-muted/70"><TableHead className="w-16">Baris</TableHead><TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>Status</TableHead><TableHead>Keterangan</TableHead></TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.row} data-testid={`item-import-row-${r.row}`}>
            <TableCell className="font-mono">{r.row}</TableCell>
            <TableCell className="font-mono text-xs">{r.code || "-"}</TableCell>
            <TableCell>{r.name || "-"}</TableCell>
            <TableCell><span className={`rounded-sm px-2 py-0.5 text-xs font-bold ${BADGE[r.action]}`}>{LABEL[r.action]}</span></TableCell>
            <TableCell className="text-xs text-muted-foreground">{r.message || "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export const ImportItemsDialog = ({ open, onOpenChange, onDone }) => {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFile(null);
      setResult(null);
    }
  }, [open]);

  const send = async (dryRun) => {
    const fd = new FormData();
    fd.append("file", file);
    setLoading(true);
    try {
      const { data } = await api.post("/items/import", fd, { params: { dry_run: dryRun } });
      if (dryRun) {
        setResult(data);
      } else {
        toast.success(`Import selesai: ${data.created} baru, ${data.updated} diperbarui${data.errors ? `, ${data.errors} baris dilewati` : ""}`);
        onDone();
        onOpenChange(false);
      }
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const valid = result ? result.created + result.updated : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" data-testid="item-import-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading uppercase tracking-tight"><MicrosoftExcelLogo size={22} weight="fill" className="text-emerald-600" /> Import Barang dari Excel</DialogTitle>
          <DialogDescription>Unduh template, isi data barang, lalu unggah. File dicek dulu sebelum disimpan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <div className="text-sm"><span className="font-semibold">1. Template</span> — kode kosong dibuat otomatis, kode yang sudah ada akan diperbarui.</div>
            <ExportButton path="/items/import-template" filename="template-import-barang.xlsx" label="Unduh Template" testid="item-import-template-button" />
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
            <span className="text-sm font-semibold">2. Unggah file</span>
            <Input type="file" accept=".xlsx" onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }} className="max-w-xs" data-testid="item-import-file" />
            <Button variant="outline" onClick={() => send(true)} disabled={!file || loading} data-testid="item-import-check-button">{loading && !result ? "Memeriksa..." : "Cek File"}</Button>
          </div>
          {result && (
            <div className="space-y-3">
              <Summary r={result} />
              {result.errors > 0 && <p className="text-xs text-destructive">Baris error akan dilewati. Perbaiki file lalu cek ulang bila perlu.</p>}
              <ResultTable rows={result.rows} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={() => send(false)} disabled={!valid || loading} data-testid="item-import-submit">{loading && result ? "Mengimpor..." : `Proses Import (${valid} barang)`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
