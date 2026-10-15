import "@/App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";
import AppLayout from "@/components/layout/AppLayout";
import MasterPage from "@/components/master/MasterPage";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Kasir from "@/pages/Kasir";
import Penerimaan from "@/pages/Penerimaan";
import Pembelian from "@/pages/Pembelian";
import Riwayat from "@/pages/Riwayat";
import TutupKasir from "@/pages/TutupKasir";
import Reminder from "@/pages/Reminder";
import Pengaturan from "@/pages/Pengaturan";
import Barang from "@/pages/master/Barang";
import { MASTER_CONFIGS } from "@/pages/master/configs";
import LaporanPenjualan from "@/pages/laporan/LaporanPenjualan";
import LaporanPembelian from "@/pages/laporan/LaporanPembelian";
import LaporanStok from "@/pages/laporan/LaporanStok";
import LaporanMekanik from "@/pages/laporan/LaporanMekanik";
import LaporanMutasi from "@/pages/laporan/LaporanMutasi";

const OWNER = ["owner"];

function Protected({ roles, children }) {
  const { user } = useAuth();
  if (user === null) {
    return <div className="grid h-screen place-items-center text-muted-foreground" data-testid="auth-loading">Memuat...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/kasir" replace />;
  return children;
}

function Home() {
  const { user } = useAuth();
  return user.role === "owner" ? <Dashboard /> : <Navigate to="/kasir" replace />;
}

const ownerOnly = (el) => <Protected roles={OWNER}>{el}</Protected>;

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <SettingsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<Protected><AppLayout /></Protected>}>
                <Route index element={<Home />} />
                <Route path="kasir" element={<Kasir />} />
                <Route path="penerimaan" element={<Penerimaan />} />
                <Route path="pembelian" element={<Pembelian />} />
                <Route path="riwayat" element={<Riwayat />} />
                <Route path="tutup-kasir" element={<TutupKasir />} />
                <Route path="reminder" element={<Reminder />} />
                <Route path="master/barang" element={ownerOnly(<Barang />)} />
                {Object.entries(MASTER_CONFIGS).map(([key, cfg]) => (
                  <Route key={key} path={`master/${key}`} element={ownerOnly(<MasterPage key={key} config={cfg} />)} />
                ))}
                <Route path="laporan/penjualan" element={ownerOnly(<LaporanPenjualan />)} />
                <Route path="laporan/pembelian" element={ownerOnly(<LaporanPembelian />)} />
                <Route path="laporan/stok" element={ownerOnly(<LaporanStok />)} />
                <Route path="laporan/mekanik" element={ownerOnly(<LaporanMekanik />)} />
                <Route path="laporan/mutasi" element={ownerOnly(<LaporanMutasi />)} />
                <Route path="pengaturan" element={ownerOnly(<Pengaturan />)} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" richColors />
        </SettingsProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
