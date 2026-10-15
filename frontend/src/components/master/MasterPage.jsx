import { useCallback, useEffect, useState } from "react";
import { MagnifyingGlass, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog, PageHeader } from "@/components/common";
import { api, errMsg } from "@/lib/api";
import { FormDialog } from "./FormDialog";

export default function MasterPage({ config }) {
  const { title, eyebrow = "Master Data", subtitle, endpoint, fields, columns, testid, rowKey = "name" } = config;
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api.get(endpoint, { params: { q } });
    setRows(data);
  }, [endpoint, q]);

  useEffect(() => {
    const t = setTimeout(() => {
      load().catch((e) => toast.error(errMsg(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [load]);

  const save = async (payload) => {
    if (editing) await api.put(`${endpoint}/${editing.id}`, payload);
    else await api.post(endpoint, payload);
    toast.success(`${title} tersimpan`);
    load();
  };

  const remove = async () => {
    try {
      await api.delete(`${endpoint}/${toDelete.id}`);
      toast.success(`${title} dihapus`);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
    setToDelete(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }} data-testid={`${testid}-add-button`}>
            <Plus size={16} className="mr-1.5" /> Tambah
          </Button>
        }
      />
      <div className="panel p-4 space-y-4">
        <div className="relative max-w-sm">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari..." className="h-10 pl-10" data-testid={`${testid}-search`} />
        </div>
        <div className="overflow-x-auto rounded-md border">
          <Table className="zebra" data-testid={`${testid}-table`}>
            <TableHeader>
              <TableRow className="bg-muted/70 hover:bg-muted/70">
                {columns.map((c) => <TableHead key={c.key} className={c.align === "right" ? "text-right" : ""}>{c.label}</TableHead>)}
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={columns.length + 1} className="py-10 text-center text-muted-foreground">Belum ada data</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.id} data-testid={`${testid}-row-${r[rowKey]}`}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={`${c.align === "right" ? "text-right" : ""} ${c.mono ? "font-mono" : ""}`}>
                      {c.render ? c.render(r) : r[c.key] || "-"}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setOpen(true); }} data-testid={`${testid}-edit-${r[rowKey]}`}><PencilSimple size={16} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setToDelete(r)} data-testid={`${testid}-delete-${r[rowKey]}`}><Trash size={16} className="text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <FormDialog open={open} onOpenChange={setOpen} title={title} fields={fields} initial={editing} onSubmit={save} testid={`${testid}-form`} />
      <ConfirmDialog open={Boolean(toDelete)} onOpenChange={(v) => !v && setToDelete(null)} title={`Hapus ${title.toLowerCase()}?`} description={`Data "${toDelete?.[rowKey] || ""}" akan dihapus permanen.`} onConfirm={remove} confirmLabel="Hapus" testid={`${testid}-delete-dialog`} />
    </div>
  );
}
