import { useState } from "react";
import { MicrosoftExcelLogo } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export const ExportButton = ({ path, params, filename, testid = "export-excel-button", label = "Export Excel" }) => {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await api.get(path, { params, responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`${filename} berhasil diunduh`);
    } catch {
      toast.error("Gagal mengekspor ke Excel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={run} disabled={loading} className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950" data-testid={testid}>
      <MicrosoftExcelLogo size={18} weight="fill" className="mr-1.5" /> {loading ? "Mengekspor..." : label}
    </Button>
  );
};
