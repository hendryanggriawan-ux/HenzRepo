import { useCallback, useEffect, useState } from "react";
import { MagnifyingGlass, Motorcycle } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { EmptyState, StatusBadge } from "@/components/common";
import { api } from "@/lib/api";
import { rp } from "@/lib/format";
import { WorkOrderView } from "./WorkOrderView";

const WoCard = ({ wo, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full rounded-md border p-3 text-left transition-colors duration-150 ${active ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:border-primary/50"}`}
    data-testid={`service-wo-item-${wo.plate_key}`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="text-lg font-black num tracking-tight">{wo.plate}</div>
      <StatusBadge status={wo.status} />
    </div>
    <div className="text-sm">{wo.customer_name}</div>
    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
      <span>{wo.mechanic_name}</span>
      <span className="num font-semibold text-foreground">{rp(wo.estimate_total)}</span>
    </div>
  </button>
);

export const ServiceCheckout = () => {
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (term) => {
    const { data } = await api.get("/work-orders", { params: { q: term, status: "active" } });
    setList(data);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      load(q).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q, load]);

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="panel flex max-h-[calc(100vh-14rem)] flex-col p-4">
        <div className="relative">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari No. Polisi / No. WO / Nama" className="h-11 pl-10 font-mono uppercase" data-testid="service-search-input" />
        </div>
        <div className="mt-3 text-xs text-muted-foreground" data-testid="service-wo-count">{list.length} kendaraan dalam servis</div>
        <div className="mt-2 flex-1 space-y-2 overflow-y-auto pr-1" data-testid="service-wo-list">
          {list.map((wo) => (
            <WoCard key={wo.id} wo={wo} active={selected?.id === wo.id} onClick={() => setSelected(wo)} />
          ))}
          {list.length === 0 && <EmptyState icon={Motorcycle} title="Tidak ada kendaraan" hint="Kendaraan yang diterima di menu Penerimaan akan muncul di sini." />}
        </div>
      </div>
      <div>
        {selected ? (
          <WorkOrderView
            key={selected.id}
            wo={selected}
            onChanged={(wo) => {
              setSelected(wo);
              load(q).catch(() => {});
            }}
            onPaid={() => {
              setSelected(null);
              load(q).catch(() => {});
            }}
          />
        ) : (
          <div className="panel">
            <EmptyState icon={MagnifyingGlass} title="Pilih kendaraan" hint="Cari berdasarkan nomor polisi lalu pilih untuk melihat detail, menambah part, dan melakukan pembayaran." testid="service-empty" />
          </div>
        )}
      </div>
    </div>
  );
};
