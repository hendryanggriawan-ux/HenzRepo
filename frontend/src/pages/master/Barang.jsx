import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowsLeftRight, Barcode, MagnifyingGlass, MicrosoftExcelLogo, PencilSimple, Plus, Printer, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog, PageHeader } from "@/components/common";
import { FormDialog } from "@/components/master/FormDialog";
import { BarcodePreview, BarcodePrintDialog } from "@/components/master/BarcodePrintDialog";
import { StockAdjustDialog } from "@/components/master/StockAdjustDialog";
import { ImportItemsDialog } from "@/components/master/ImportItemsDialog";
import { useSettings } from "@/context/SettingsContext";
import { api, errMsg } from "@/lib/api";
import { num, rp } from "@/lib/format";

const BASE_FIELDS = [
  { name: "code", label: "Kode / Barcode", mono: true, placeholder: "Kosongkan untuk generate otomatis", hint: "Scan barcode pabrik atau biarkan kosong" },
  { name: "name", label: "Nama Barang", required: true },
  { name: "category", label: "Kategori" },
  { name: "unit", label: "Satuan", default: "pcs" },
  { name: "buy_price", label: "Harga Beli (Rp)", type: "number", mono: true },
  { name: "sell_price", label: "Harga Jual (Rp)", type: "number", required: true, mono: true },
  { name: "min_stock", label: "Stok Minimum", type: "number", mono: true, hint: "Batas peringatan stok menipis" },
];
const CREATE_FIELDS = [...BASE_FIELDS, { name: "stock", label: "Stok Awal", type: "number", mono: true }];

const isLow = (i, threshold) => i.stock <= (i.min_stock > 0 ? i.min_stock : threshold);

const ItemRow = ({ item, checked, onCheck, low, onBarcode, onEdit, onDelete }) => (
  <TableRow data-testid={`item-row-${item.code}`}>
    <TableCell><Checkbox checked={checked} onCheckedChange={onCheck} data-testid={`item-select-${item.code}`} /></TableCell>
    <TableCell className="font-mono text-xs">{item.code}</TableCell>
    <TableCell className="font-medium">{item.name}</TableCell>
    <TableCell>{item.category || "-"}</TableCell>
    <TableCell className="text-right font-mono">{num(item.buy_price)}</TableCell>
    <TableCell className="text-right font-mono font-semibold">{num(item.sell_price)}</TableCell>
    <TableCell className="text-right">
      <span className={`rounded-sm px-2 py-0.5 font-mono font-bold ${low ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200" : ""}`} data-testid={`item-stock-${item.code}`}>{num(item.stock)}</span>
      <span className="ml-1 text-xs text-muted-foreground">{item.unit}</span>
    </TableCell>
    <TableCell className="text-right font-mono text-muted-foreground">{num(item.min_stock)}</TableCell>
    <TableCell>
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" onClick={onBarcode} data-testid={`item-barcode-${item.code}`}><Barcode size={16} /></Button>
        <Button variant="ghost" size="icon" onClick={onEdit} data-testid={`item-edit-${item.code}`}><PencilSimple size={16} /></Button>
        <Button variant="ghost" size="icon" onClick={onDelete} data-testid={`item-delete-${item.code}`}><Trash size={16} className="text-destructive" /></Button>
      </div>
    </TableCell>
  </TableRow>
);

const SingleBarcode = ({ item, onClose, onPrint }) => (
  <Dialog open={Boolean(item)} onOpenChange={(v) => !v && onClose()}>
    <DialogContent className="max-w-sm" data-testid="item-barcode-dialog">
      <DialogHeader>
        <DialogTitle className="font-heading uppercase">{item?.name}</DialogTitle>
        <DialogDescription>{item && rp(item.sell_price)}</DialogDescription>
      </DialogHeader>
      {item && <BarcodePreview code={item.code} testid="item-barcode-preview" />}
      <Button onClick={onPrint} data-testid="item-barcode-print-button"><Printer size={16} className="mr-1.5" /> Cetak Label</Button>
    </DialogContent>
  </Dialog>
);

export default function Barang() {
  const { settings } = useSettings();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState({});
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [preview, setPreview] = useState(null);
  const [printItems, setPrintItems] = useState(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const fields = useMemo(() => (editing ? BASE_FIELDS : CREATE_FIELDS), [editing]);

  const load = useCallback(async () => {
    const { data } = await api.get("/items", { params: { q } });
    setRows(data);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => {
      load().catch((e) => toast.error(errMsg(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [load]);

  const save = async (payload) => {
    if (editing) await api.put(`/items/${editing.id}`, payload);
    else await api.post("/items", payload);
    toast.success("Barang tersimpan");
    load();
  };

  const remove = async () => {
    try {
      await api.delete(`/items/${toDelete.id}`);
      toast.success("Barang dihapus");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
    setToDelete(null);
  };

  const chosen = rows.filter((r) => selected[r.id]);
  const allChecked = rows.length > 0 && chosen.length === rows.length;

  return (
    <div>
      <PageHeader
        eyebrow="Master Data"
        title="Barang & Barcode"
        subtitle="Sparepart, harga, stok, dan cetak label barcode"
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)} className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300" data-testid="item-import-button"><MicrosoftExcelLogo size={16} weight="fill" className="mr-1.5" /> Import Excel</Button>
            <Button variant="outline" onClick={() => setAdjustOpen(true)} data-testid="item-stock-adjust-button"><ArrowsLeftRight size={16} className="mr-1.5" /> Barang Masuk/Keluar</Button>
            <Button variant="outline" disabled={!chosen.length} onClick={() => setPrintItems(chosen)} data-testid="item-print-barcode-button"><Printer size={16} className="mr-1.5" /> Cetak Barcode ({chosen.length})</Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} data-testid="item-add-button"><Plus size={16} className="mr-1.5" /> Tambah Barang</Button>
          </>
        }
      />
      <div className="panel space-y-4 p-4">
        <div className="relative max-w-sm">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / kode / kategori" className="h-10 pl-10" data-testid="item-search" />
        </div>
        <div className="overflow-x-auto rounded-md border">
          <Table className="zebra" data-testid="item-table">
            <TableHeader>
              <TableRow className="bg-muted/70 hover:bg-muted/70">
                <TableHead className="w-10"><Checkbox checked={allChecked} onCheckedChange={(v) => setSelected(v ? Object.fromEntries(rows.map((r) => [r.id, true])) : {})} data-testid="item-select-all" /></TableHead>
                <TableHead>Kode</TableHead><TableHead>Nama Barang</TableHead><TableHead>Kategori</TableHead>
                <TableHead className="text-right">Hrg Beli</TableHead><TableHead className="text-right">Hrg Jual</TableHead>
                <TableHead className="text-right">Stok</TableHead><TableHead className="text-right">Min</TableHead><TableHead className="w-32 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Belum ada barang</TableCell></TableRow>}
              {rows.map((r) => (
                <ItemRow
                  key={r.id}
                  item={r}
                  checked={Boolean(selected[r.id])}
                  onCheck={(v) => setSelected({ ...selected, [r.id]: Boolean(v) })}
                  low={isLow(r, settings.low_stock_threshold)}
                  onBarcode={() => setPreview(r)}
                  onEdit={() => { setEditing(r); setFormOpen(true); }}
                  onDelete={() => setToDelete(r)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <FormDialog open={formOpen} onOpenChange={setFormOpen} title="Barang" fields={fields} initial={editing} onSubmit={save} testid="item-form" />
      <ConfirmDialog open={Boolean(toDelete)} onOpenChange={(v) => !v && setToDelete(null)} title="Hapus barang?" description={`"${toDelete?.name || ""}" akan dihapus permanen.`} onConfirm={remove} confirmLabel="Hapus" testid="item-delete-dialog" />
      <SingleBarcode item={preview} onClose={() => setPreview(null)} onPrint={() => { setPrintItems([preview]); setPreview(null); }} />
      <BarcodePrintDialog open={Boolean(printItems)} onOpenChange={(v) => !v && setPrintItems(null)} items={printItems || []} />
      <StockAdjustDialog open={adjustOpen} onOpenChange={setAdjustOpen} onDone={load} />
      <ImportItemsDialog open={importOpen} onOpenChange={setImportOpen} onDone={load} />
    </div>
  );
}
