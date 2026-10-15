import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LockSimple, Motorcycle, User } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState("");

  useEffect(() => {
    api.get("/settings/public").then((r) => setStore(r.data.store_name)).catch(() => {});
  }, []);

  if (user) return <Navigate to={user.role === "owner" ? "/" : "/kasir"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await login(username, password);
      navigate(u.role === "owner" ? "/" : "/kasir", { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.2fr_1fr]">
      <div className="relative hidden overflow-hidden bg-slate-950 lg:block">
        <img src="/img/login-bg.jpg" alt="Bengkel motor" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />
        <div className="absolute inset-x-0 top-0 h-2 hazard" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <div className="eyebrow mb-3 text-orange-400">Point of Sales · Bengkel</div>
          <h1 className="max-w-xl text-4xl font-black uppercase leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">Servis cepat. Kasir rapi. Stok terkontrol.</h1>
          <p className="mt-5 max-w-md text-slate-300">Penerimaan kendaraan, estimasi biaya, penjualan sparepart, barcode, dan laporan — berjalan offline di jaringan bengkel Anda.</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-background p-6 sm:p-10">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6 fade-up" data-testid="login-form">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-sm bg-primary text-white"><Motorcycle size={28} weight="fill" /></div>
            <div>
              <div className="font-heading text-lg font-black uppercase tracking-tight" data-testid="login-store-name">{store || "POS Bengkel"}</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Masuk ke sistem</div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username / Email</Label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} className="h-11 pl-10" autoComplete="username" data-testid="login-username-input" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <LockSimple size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pl-10" autoComplete="current-password" data-testid="login-password-input" />
              </div>
            </div>
          </div>
          {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" data-testid="login-error">{error}</div>}
          <Button type="submit" disabled={loading || !username || !password} className="tactile h-12 w-full font-heading text-base font-black uppercase tracking-wide" data-testid="login-submit-button">
            {loading ? "Memproses..." : "Masuk"}
          </Button>
          <p className="text-xs text-muted-foreground">Akses Owner/Admin & Kasir. Hubungi owner bila lupa password.</p>
        </form>
      </div>
    </div>
  );
}
