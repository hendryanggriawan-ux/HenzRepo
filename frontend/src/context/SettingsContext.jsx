import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const DEFAULTS = {
  store_name: "",
  address: "",
  phone: "",
  receipt_footer: "",
  paper_width: "58",
  qris_image: "",
  low_stock_threshold: 5,
  high_stock_threshold: 50,
  service_interval_days: 60,
  reminder_days_ahead: 7,
  country_code: "62",
  wa_template: "",
};

const SettingsCtx = createContext({ settings: DEFAULTS, reload: () => {} });

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULTS);

  const reload = useCallback(async () => {
    const { data } = await api.get("/settings");
    setSettings(data);
  }, []);

  useEffect(() => {
    if (user) {
      reload().catch(() => {});
    }
  }, [user, reload]);

  return <SettingsCtx.Provider value={{ settings, reload, setSettings }}>{children}</SettingsCtx.Provider>;
}

export const useSettings = () => useContext(SettingsCtx);
