import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { makeTheme } from "./theme";

type Mode = "light" | "dark";
const Ctx = createContext<{ mode: Mode; toggle: () => void }>({ mode: "dark", toggle: () => {} });
export const useMode = () => useContext(Ctx);
const initial = (): Mode => {
  try { const m = localStorage.getItem("mode"); if (m === "light" || m === "dark") return m; } catch {}
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
};
export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(initial);
  useEffect(() => { document.documentElement.dataset.theme = mode; try { localStorage.setItem("mode", mode); } catch {} }, [mode]);
  const theme = useMemo(() => makeTheme(mode), [mode]);
  return <Ctx.Provider value={{ mode, toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")) }}><ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider></Ctx.Provider>;
}
