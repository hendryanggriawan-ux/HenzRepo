import { useState } from "react";
import { ShoppingCart } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errMsg } from "@/lib/api";
import { linesTotal, num, rp } from "@/lib/format";
import { ItemPicker } from "./ItemPicker";
import { LinesTable } from "./LinesTable";
import { PaymentDialog } from "./PaymentDialog";
import { ReceiptDialog } from "./ReceiptDialog";

export const addItemLine = (lines, item, extraReserved = 0) => {
  const idx = lines.findIndex((l) => l.item_id === item.id);
  const cur = idx >= 0 ? Number(lines[idx].qty) || 0 : 0;
  if (cur + 1 + extraReserved > item.stock) {
    toast.error(`Stok ${item.name} tidak cukup (sisa ${num(item.stock - extraReserved)})`);
    return lines;
  }
  if (idx >= 0) return lines.map((l, i) => (i === idx ? { ...l, qty: cur + 1 } : l));
  return [...lines, { item_id: item.id, code: item.code, name: item.name, qty: 1, price: item.sell_price, stock: item.stock - extraReserved }];
};

const Summary = ({ cart, customer, setCustomer, onPay, onClear }) => {
  const subtotal = linesTotal(cart);
  const valid = cart.length > 0 && cart.every((l) => Number(l.qty) > 0 && Number(l.qty) <= l.stock);
  return (
    <div className="panel sticky top-20 flex flex-col">
      <div className="border-b p-4">
        <div className="eyebrow">Pelanggan (opsional)</div>
        <div className="mt-3 space-y-2">
          <Input placeholder="Nama pelanggan" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} data-testid="part-sale-customer-name" />
          <Input placeholder="No. WhatsApp" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} data-testid="part-sale-customer-phone" />
        </div>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Jumlah item</span><span className="num font-semibold" data-testid="part-sale-item-count">{num(cart.reduce((s, l) => s + (Number(l.qty) || 0), 0))}</span></div>
        <div className="flex items-end justify-between border-t pt-3">
          <span className="font-heading text-sm font-bold uppercase">Total</span>
          <span className="text-3xl font-black num" data-testid="part-sale-total">{rp(subtotal)}</span>
        </div>
      </div>
      <div className="space-y-2 p-4 pt-0">
        <Button onClick={onPay} disabled={!valid} className="tactile h-14 w-full font-heading text-lg font-black uppercase tracking-wide" data-testid="part-sale-pay-button">
          Bayar
        </Button>
        <Button variant="ghost" onClick={onClear} disabled={!cart.length} className="w-full" data-testid="part-sale-clear-button">
          Kosongkan Keranjang
        </Button>
      </div>
    </div>
  );
};

export const PartSale = () => {
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [payOpen, setPayOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sale, setSale] = useState(null);

  const pay = async (p) => {
    setLoading(true);
    try {
      const { data } = await api.post("/sales", {
        items: cart.map((l) => ({ item_id: l.item_id, qty: Number(l.qty) })),
        customer_name: customer.name,
        customer_phone: customer.phone,
        payment: p,
      });
      setSale(data);
      setCart([]);
      setCustomer({ name: "", phone: "" });
      setPayOpen(false);
      toast.success(`Transaksi ${data.number} tersimpan`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="panel p-4 space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingCart size={20} weight="duotone" className="text-primary" />
          <h2 className="font-heading text-base font-bold uppercase tracking-tight">Penjualan Sparepart (tanpa jasa)</h2>
        </div>
        <ItemPicker autoFocus onPick={(item) => setCart(addItemLine(cart, item))} testid="part-sale-picker" />
        <LinesTable lines={cart} onChange={setCart} testid="part-sale-cart" empty="Scan barcode atau cari barang untuk menambah ke keranjang" />
      </div>
      <Summary cart={cart} customer={customer} setCustomer={setCustomer} onPay={() => setPayOpen(true)} onClear={() => setCart([])} />
      <PaymentDialog open={payOpen} onOpenChange={setPayOpen} subtotal={linesTotal(cart)} onSubmit={pay} loading={loading} title="Pembayaran Penjualan Part" />
      <ReceiptDialog sale={sale} onClose={() => setSale(null)} />
    </div>
  );
};
