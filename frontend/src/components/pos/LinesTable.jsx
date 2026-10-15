import { Trash } from "@phosphor-icons/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { num } from "@/lib/format";

const NumCell = ({ editable, value, onChange, testid }) =>
  editable ? (
    <Input type="number" min="0" step="any" value={value} onChange={(e) => onChange(e.target.value)} className="ml-auto h-9 w-24 text-right font-mono" data-testid={testid} />
  ) : (
    <span className="font-mono">{num(value)}</span>
  );

export const LinesTable = ({ lines, onChange, priceEditable = false, testid = "lines", empty = "Belum ada barang", showAddedBy = false }) => {
  const editable = Boolean(onChange);
  const update = (idx, patch) => onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const remove = (idx) => onChange(lines.filter((_, i) => i !== idx));

  return (
    <div className="overflow-x-auto rounded-md border" data-testid={testid}>
      <Table className="zebra">
        <TableHeader>
          <TableRow className="bg-muted/70 hover:bg-muted/70">
            <TableHead>Barang</TableHead>
            <TableHead className="w-28 text-right">Qty</TableHead>
            <TableHead className="w-32 text-right">Harga</TableHead>
            <TableHead className="w-32 text-right">Subtotal</TableHead>
            {editable && <TableHead className="w-12" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground" data-testid={`${testid}-empty`}>
                {empty}
              </TableCell>
            </TableRow>
          )}
          {lines.map((l, i) => {
            const over = l.stock !== undefined && Number(l.qty) > Number(l.stock);
            return (
              <TableRow key={`${l.item_id}-${i}`} data-testid={`${testid}-row-${i}`}>
                <TableCell>
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {l.code}
                    {showAddedBy && l.added_by ? ` · ditambah ${l.added_by}` : ""}
                    {over && <span className="ml-1 font-sans font-semibold text-destructive">· stok hanya {num(l.stock)}</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <NumCell editable={editable} value={l.qty} onChange={(v) => update(i, { qty: v })} testid={`${testid}-qty-${i}`} />
                </TableCell>
                <TableCell className="text-right">
                  <NumCell editable={editable && priceEditable} value={l.price} onChange={(v) => update(i, { price: v })} testid={`${testid}-price-${i}`} />
                </TableCell>
                <TableCell className="text-right font-mono font-semibold" data-testid={`${testid}-subtotal-${i}`}>
                  {num((Number(l.qty) || 0) * (Number(l.price) || 0))}
                </TableCell>
                {editable && (
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => remove(i)} data-testid={`${testid}-remove-${i}`}>
                      <Trash size={16} />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
