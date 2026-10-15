import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common";
import { ClosingDialog } from "@/components/cash/ClosingDialog";
import { ClosingForm } from "@/components/cash/ClosingForm";
import { ClosingHistory } from "@/components/cash/ClosingHistory";

export default function TutupKasir() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState(null);

  return (
    <div>
      <PageHeader eyebrow="Kasir" title="Tutup Kasir Harian" subtitle="Rekap transaksi shift Anda, cocokkan uang fisik di laci, lalu cetak laporan tutup kasir" />
      <div className="grid gap-4 xl:grid-cols-[460px_1fr]">
        <ClosingForm
          onClosed={(c) => {
            setView(c);
            setRefreshKey((k) => k + 1);
            toast.success(`Kasir ditutup (${c.number})`);
          }}
        />
        <ClosingHistory refreshKey={refreshKey} onView={setView} />
      </div>
      <ClosingDialog closing={view} onClose={() => setView(null)} />
    </div>
  );
}
