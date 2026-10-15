import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common";
import { PurchaseForm } from "@/components/purchase/PurchaseForm";
import { PurchaseHistory } from "@/components/purchase/PurchaseHistory";

export default function Pembelian() {
  return (
    <div>
      <PageHeader eyebrow="Operasional" title="Pembelian Barang" subtitle="Penerimaan barang dari supplier / distributor — stok bertambah otomatis" />
      <Tabs defaultValue="baru">
        <TabsList className="mb-4 h-11">
          <TabsTrigger value="baru" className="h-9 px-4 font-semibold" data-testid="pembelian-tab-new">Pembelian Baru</TabsTrigger>
          <TabsTrigger value="riwayat" className="h-9 px-4 font-semibold" data-testid="pembelian-tab-history">Riwayat Pembelian</TabsTrigger>
        </TabsList>
        <TabsContent value="baru"><PurchaseForm /></TabsContent>
        <TabsContent value="riwayat"><PurchaseHistory /></TabsContent>
      </Tabs>
    </div>
  );
}
