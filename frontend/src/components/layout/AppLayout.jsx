import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { List, Moon, SignOut, Sun } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "./Sidebar";

const Clock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="hidden md:inline text-sm text-muted-foreground num" data-testid="topbar-clock">
      {now.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} ·{" "}
      {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
};

const ThemeToggle = () => {
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("pos_theme", next ? "dark" : "light");
    setDark(next);
  };
  return (
    <Button variant="ghost" size="icon" onClick={toggle} data-testid="theme-toggle-button" title="Ganti tema">
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </Button>
  );
};

const Topbar = ({ onMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card px-4 md:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} data-testid="sidebar-open-button">
        <List size={22} />
      </Button>
      <Clock />
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <div className="hidden sm:flex flex-col items-end leading-tight pr-2" data-testid="topbar-user">
          <span className="text-sm font-semibold">{user.name}</span>
          <span className="text-[10px] font-heading font-bold uppercase tracking-widest text-primary" data-testid="topbar-user-role">
            {user.role === "owner" ? "Owner / Admin" : "Kasir"}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            logout();
            navigate("/login");
          }}
          data-testid="logout-button"
        >
          <SignOut size={16} className="mr-1.5" /> Keluar
        </Button>
      </div>
    </header>
  );
};

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 print-plain" data-testid="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
