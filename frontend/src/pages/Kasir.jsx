import { Link } from "react-router-dom";
import { Motorcycle, ShoppingCart, Vault } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common";
import { PartSale } from "@/components/pos/PartSale";
import { ServiceCheckout } from "@/components/pos/ServiceCheckout";

export default function Kasir() {
  return (
    <div>
      <PageHeader
        eyebrow="Kasir"
        title="Point of Sales"
        subtitle="Penjualan sparepart & pembayaran kendaraan yang sudah diterima"
        actions={<Button asChild variant="outline"><Link to="/tutup-kasir" data-testid="kasir-close-shortcut"><Vault size={16} className="mr-1.5" /> Tutup Kasir</Link></Button>}
      />
      <Tabs defaultValue="part">
        <TabsList className="mb-4 h-11">
          <TabsTrigger value="part" className="h-9 px-4 font-semibold" data-testid="kasir-tab-part"><ShoppingCart size={16} className="mr-1.5" /> Penjualan Part</TabsTrigger>
          <TabsTrigger value="service" className="h-9 px-4 font-semibold" data-testid="kasir-tab-service"><Motorcycle size={16} className="mr-1.5" /> Kendaraan Diterima</TabsTrigger>
        </TabsList>
        <TabsContent value="part"><PartSale /></TabsContent>
        <TabsContent value="service"><ServiceCheckout /></TabsContent>
      </Tabs>
    </div>
  );
}
