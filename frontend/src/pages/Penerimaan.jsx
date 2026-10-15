import { useState } from "react";
import { CheckCircle, Printer } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common";
import { WorkOrderForm } from "@/components/workorder/WorkOrderForm";
import { WorkOrderList } from "@/components/workorder/WorkOrderList";
import { useSettings } from "@/context/SettingsContext";
import { rp } from "@/lib/format";
import { estimateHtml, printHtml } from "@/lib/print";

const SavedDialog = ({ wo, onClose, onList }) => {
  const { settings } = useSettings();
  return (
    <Dialog open={Boolean(wo)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent data-testid="wo-saved-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading uppercase"><CheckCircle size={24} weight="fill" className="text-emerald-500" /> Kendaraan Diterima</DialogTitle>
          <DialogDescription>Work order tersimpan dan sudah muncul di menu Kasir.</DialogDescription>
        </DialogHeader>
        {wo && (
          <div className="rounded-md border p-4">
            <div className="text-xs font-mono text-muted-foreground" data-testid="wo-saved-number">{wo.number}</div>
            <div className="text-2xl font-black num">{wo.plate}</div>
            <div className="text-sm">{wo.customer_name} · Mekanik {wo.mechanic_name}</div>
            <div className="mt-2 text-lg font-black num" data-testid="wo-saved-total">Estimasi {rp(wo.estimate_total)}</div>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onList} data-testid="wo-saved-list-button">Lihat Daftar Servis</Button>
          <Button onClick={() => printHtml(estimateHtml(wo, settings), settings.paper_width, wo.number)} data-testid="wo-saved-print-button"><Printer size={18} className="mr-1.5" /> Cetak Estimasi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function Penerimaan() {
  const [tab, setTab] = useState("baru");
  const [formKey, setFormKey] = useState(0);
  const [listKey, setListKey] = useState(0);
  const [saved, setSaved] = useState(null);
  const [editing, setEditing] = useState(null);

  return (
    <div>
      <PageHeader eyebrow="Operasional" title="Penerimaan Kendaraan" subtitle="Catat kendaraan masuk, tunjuk mekanik, dan buat estimasi biaya servis" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 h-11">
          <TabsTrigger value="baru" className="h-9 px-4 font-semibold" data-testid="penerimaan-tab-new">Penerimaan Baru</TabsTrigger>
          <TabsTrigger value="daftar" className="h-9 px-4 font-semibold" data-testid="penerimaan-tab-list">Daftar Servis</TabsTrigger>
        </TabsList>
        <TabsContent value="baru">
          <WorkOrderForm key={formKey} onSaved={(wo) => { setSaved(wo); setFormKey((k) => k + 1); setListKey((k) => k + 1); }} />
        </TabsContent>
        <TabsContent value="daftar">
          <WorkOrderList key={listKey} onEdit={setEditing} />
        </TabsContent>
      </Tabs>
      <SavedDialog wo={saved} onClose={() => setSaved(null)} onList={() => { setSaved(null); setTab("daftar"); }} />
      <Dialog open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto" data-testid="wo-edit-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase">Edit Work Order {editing?.number}</DialogTitle>
            <DialogDescription>Hanya owner/admin yang dapat mengubah data servis.</DialogDescription>
          </DialogHeader>
          {editing && (
            <WorkOrderForm initial={editing} onSaved={() => { setEditing(null); setListKey((k) => k + 1); toast.success("Work order diperbarui"); }} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
