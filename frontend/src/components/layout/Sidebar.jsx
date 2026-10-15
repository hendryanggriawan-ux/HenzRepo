import { NavLink } from "react-router-dom";
import { Motorcycle, X } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { NAV } from "./nav";

const linkCls = ({ isActive }) =>
  `group flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors duration-150 ${
    isActive
      ? "bg-orange-500 text-white font-semibold"
      : "text-slate-300 hover:bg-slate-800 hover:text-white"
  }`;

const NavGroup = ({ group, items }) => (
  <div className="mb-5">
    <div className="px-3 pb-2 font-heading text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{group}</div>
    <div className="space-y-0.5">
      {items.map(({ to, label, icon: Icon, end, id }) => (
        <NavLink key={to} to={to} end={end} className={linkCls} data-testid={`nav-${id}`}>
          <Icon size={18} weight="duotone" />
          <span className="truncate">{label}</span>
        </NavLink>
      ))}
    </div>
  </div>
);

export const Sidebar = ({ open, onClose }) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(user.role)) })).filter((g) => g.items.length);

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden no-print" onClick={onClose} data-testid="sidebar-overlay" />}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-slate-950 text-slate-200 flex flex-col transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="sidebar"
      >
        <div className="h-1.5 hazard" />
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
          <div className="grid h-10 w-10 place-items-center rounded-sm bg-orange-500 text-white">
            <Motorcycle size={24} weight="fill" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-heading text-sm font-black uppercase tracking-tight truncate text-white" data-testid="sidebar-store-name">
              {settings.store_name || "POS Bengkel"}
            </div>
            <div className="text-[11px] uppercase tracking-widest text-slate-500">Point of Sales</div>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={onClose} data-testid="sidebar-close-button">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {groups.map((g) => (
            <NavGroup key={g.group} group={g.group} items={g.items} />
          ))}
        </nav>
        <div className="border-t border-slate-800 px-4 py-3 text-[11px] text-slate-500">Mode offline · LAN</div>
      </aside>
    </>
  );
};
