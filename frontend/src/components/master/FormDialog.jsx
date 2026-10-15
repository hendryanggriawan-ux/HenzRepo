import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, errMsg } from "@/lib/api";

const NONE = "__none";

const FieldInput = ({ field, value, onChange, options, isEdit, testid }) => {
  if (field.type === "textarea") {
    return <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid} />;
  }
  if (field.type === "switch") {
    return (
      <div className="flex h-10 items-center gap-3">
        <Switch checked={Boolean(value)} onCheckedChange={onChange} data-testid={testid} />
        <span className="text-sm">{value ? "Aktif" : "Nonaktif"}</span>
      </div>
    );
  }
  if (field.type === "select") {
    const opts = field.options || options || [];
    return (
      <Select value={value || (field.optional ? NONE : "")} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger className="h-10" data-testid={testid}><SelectValue placeholder={`Pilih ${field.label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          {field.optional && <SelectItem value={NONE}>— Tidak ada —</SelectItem>}
          {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      type={field.type || "text"}
      min={field.type === "number" ? "0" : undefined}
      step={field.type === "number" ? "any" : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={isEdit && field.editPlaceholder ? field.editPlaceholder : field.placeholder}
      className={field.mono ? "font-mono" : ""}
      data-testid={testid}
    />
  );
};

const initValues = (fields, initial) =>
  Object.fromEntries(fields.map((f) => [f.name, initial?.[f.name] ?? f.default ?? (f.type === "switch" ? true : "")]));

export const FormDialog = ({ open, onOpenChange, title, fields, initial, onSubmit, testid = "form-dialog" }) => {
  const [values, setValues] = useState({});
  const [options, setOptions] = useState({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initial);

  useEffect(() => {
    if (!open) return;
    setValues(initValues(fields, initial));
    fields.filter((f) => f.optionsEndpoint).forEach((f) => {
      api.get(f.optionsEndpoint).then((r) => setOptions((o) => ({ ...o, [f.name]: r.data.map(f.mapOption) }))).catch(() => {});
    });
  }, [open, initial, fields]);

  const submit = async (e) => {
    e.preventDefault();
    const missing = fields.find((f) => (f.required || (f.requiredOnCreate && !isEdit)) && String(values[f.name] ?? "").trim() === "");
    if (missing) {
      toast.error(`${missing.label} wajib diisi`);
      return;
    }
    const payload = Object.fromEntries(fields.map((f) => [f.name, f.type === "number" ? Number(values[f.name]) || 0 : values[f.name]]));
    setSaving(true);
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid={testid}>
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-tight">{isEdit ? `Edit ${title}` : `Tambah ${title}`}</DialogTitle>
          <DialogDescription>Lengkapi data lalu simpan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((f) => (
              <div key={f.name} className={`space-y-1.5 ${f.type === "textarea" || f.wide ? "md:col-span-2" : ""}`}>
                <Label className="text-xs font-semibold">{f.label}{f.required || (f.requiredOnCreate && !isEdit) ? " *" : ""}</Label>
                <FieldInput field={f} value={values[f.name] ?? ""} onChange={(v) => setValues((p) => ({ ...p, [f.name]: v }))} options={options[f.name]} isEdit={isEdit} testid={`${testid}-${f.name}`} />
                {f.hint && <p className="text-[11px] text-muted-foreground">{f.hint}</p>}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid={`${testid}-cancel`}>Batal</Button>
            <Button type="submit" disabled={saving} data-testid={`${testid}-submit`}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
