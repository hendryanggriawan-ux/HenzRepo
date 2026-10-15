import { useEffect, useRef, useState } from "react";
import { Barcode, Camera } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { num, rp } from "@/lib/format";
import { CameraScanner } from "./CameraScanner";

const ResultList = ({ results, onPick, priceKey, testid }) => (
  <div className="absolute z-30 mt-1 w-full max-h-72 overflow-auto rounded-md border bg-card shadow-lg" data-testid={`${testid}-results`}>
    {results.map((it) => (
      <button
        type="button"
        key={it.id}
        onClick={() => onPick(it)}
        className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left transition-colors last:border-0 hover:bg-muted"
        data-testid={`${testid}-result-${it.code}`}
      >
        <div className="min-w-0">
          <div className="truncate font-medium">{it.name}</div>
          <div className="text-xs text-muted-foreground font-mono">
            {it.code} · stok {num(it.stock)} {it.unit}
          </div>
        </div>
        <div className="whitespace-nowrap font-mono text-sm font-semibold">{rp(it[priceKey])}</div>
      </button>
    ))}
  </div>
);

export const ItemPicker = ({ onPick, testid = "item-picker", placeholder = "Scan barcode / ketik nama barang lalu Enter", autoFocus = false, priceKey = "sell_price" }) => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [cam, setCam] = useState(false);
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const latest = useRef("");

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    latest.current = q;
    const term = q.trim();
    if (!term) {
      setResults([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/items", { params: { q: term, limit: 12 } });
        if (latest.current.trim() !== term) return;
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const h = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pick = (item) => {
    onPick(item);
    latest.current = "";
    setQ("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const lookup = async (code) => {
    const term = code.trim();
    if (!term) return;
    try {
      const { data } = await api.get(`/items/code/${encodeURIComponent(term)}`);
      pick(data);
    } catch {
      if (results.length === 1) pick(results[0]);
      else toast.error(`Barang "${term}" tidak ditemukan`);
    }
  };

  return (
    <div ref={boxRef} className="relative" data-testid={testid}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Barcode size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                lookup(q);
              }
              if (e.key === "Escape") setOpen(false);
            }}
            onFocus={() => results.length && setOpen(true)}
            placeholder={placeholder}
            autoComplete="off"
            className="h-11 pl-10 font-mono"
            data-testid={`${testid}-input`}
          />
        </div>
        <Button type="button" variant="outline" className="h-11" onClick={() => setCam(true)} title="Scan via kamera" data-testid={`${testid}-camera-button`}>
          <Camera size={20} />
        </Button>
      </div>
      {open && results.length > 0 && <ResultList results={results} onPick={pick} priceKey={priceKey} testid={testid} />}
      <CameraScanner
        open={cam}
        onClose={() => setCam(false)}
        onDetected={(code) => {
          setCam(false);
          lookup(code);
        }}
      />
    </div>
  );
};
