import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { STATUS, addDays, todayStr } from "@/lib/format";

export const PageHeader = ({ eyebrow, title, subtitle, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4 fade-up">
    <div className="min-w-0">
      {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
      <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight" data-testid="page-title">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 no-print">{actions}</div>}
  </div>
);

export const StatCard = ({ label, value, sub, icon: Icon, testid, accent = false }) => (
  <div className={`panel p-5 relative overflow-hidden ${accent ? "border-orange-500/60" : ""}`} data-testid={testid}>
    {accent && <div className="absolute inset-x-0 top-0 h-1 bg-primary" />}
    <div className="flex items-start justify-between gap-3">
      <div className="text-[11px] font-heading font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      {Icon && <Icon size={22} weight="duotone" className="text-primary shrink-0" />}
    </div>
    <div className="mt-3 text-2xl lg:text-3xl font-black num tracking-tight" data-testid={testid ? `${testid}-value` : undefined}>{value}</div>
    {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
  </div>
);

export const StatusBadge = ({ status, testid }) => {
  const s = STATUS[status] || { label: status, cls: "" };
  return (
    <Badge variant="outline" className={`rounded-sm font-semibold uppercase text-[10px] tracking-wider ${s.cls}`} data-testid={testid}>
      {s.label}
    </Badge>
  );
};

const monthStart = () => `${todayStr().slice(0, 8)}01`;

export const DateRange = ({ value, onChange, testid = "date-range" }) => {
  const quick = [
    { label: "Hari ini", start: todayStr(), end: todayStr() },
    { label: "7 hari", start: addDays(todayStr(), -6), end: todayStr() },
    { label: "Bulan ini", start: monthStart(), end: todayStr() },
  ];
  return (
    <div className="flex flex-wrap items-end gap-2 no-print" data-testid={testid}>
      <div className="space-y-1">
        <Label className="text-xs">Dari</Label>
        <Input type="date" value={value.start} onChange={(e) => onChange({ ...value, start: e.target.value })} className="h-10 w-40" data-testid={`${testid}-start`} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Sampai</Label>
        <Input type="date" value={value.end} onChange={(e) => onChange({ ...value, end: e.target.value })} className="h-10 w-40" data-testid={`${testid}-end`} />
      </div>
      {quick.map((q) => (
        <Button key={q.label} variant="outline" size="sm" className="h-10" onClick={() => onChange({ start: q.start, end: q.end })} data-testid={`${testid}-quick-${q.label.replace(/\s/g, "-").toLowerCase()}`}>
          {q.label}
        </Button>
      ))}
    </div>
  );
};

export const ConfirmDialog = ({ open, onOpenChange, title, description, onConfirm, confirmLabel = "Ya, lanjutkan", testid = "confirm-dialog" }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent data-testid={testid}>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel data-testid={`${testid}-cancel`}>Batal</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid={`${testid}-confirm`}>
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export const EmptyState = ({ icon: Icon, title, hint, testid }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-6 text-muted-foreground" data-testid={testid}>
    {Icon && <Icon size={40} weight="duotone" className="mb-3 text-slate-400" />}
    <div className="font-heading font-bold uppercase tracking-tight text-foreground">{title}</div>
    {hint && <div className="mt-1 text-sm max-w-sm">{hint}</div>}
  </div>
);
