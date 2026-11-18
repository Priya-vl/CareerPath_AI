import { createTheme } from "@mui/material";
const glass = { background: "var(--glass)", backgroundImage: "none", border: "1px solid var(--line)", backdropFilter: "blur(14px)", borderRadius: 18 };
export const makeTheme = (mode: "light" | "dark") => {
  const dark = mode === "dark";
  return createTheme({
    palette: dark
      ? { mode, primary: { main: "#8B5CF6" }, secondary: { main: "#22D3EE" }, background: { default: "#0B0720", paper: "#1A1040" }, text: { primary: "#F3EEFF", secondary: "#B9B0D9" }, divider: "rgba(167,139,250,.28)" }
      : { mode, primary: { main: "#6D28D9" }, secondary: { main: "#0E7490" }, background: { default: "#F7F4FF", paper: "#FFFFFF" }, text: { primary: "#1B1235", secondary: "#5B5280" }, divider: "rgba(109,40,217,.22)" },
    shape: { borderRadius: 14 },
    typography: { fontFamily: "'Plus Jakarta Sans', sans-serif", h3: { fontWeight: 800 }, h4: { fontWeight: 800 }, h5: { fontWeight: 700 }, h6: { fontWeight: 700 } },
    components: {
      MuiPaper: { styleOverrides: { root: glass } }, MuiCard: { styleOverrides: { root: glass } },
      MuiButton: { styleOverrides: { root: { textTransform: "none", fontWeight: 700, borderRadius: 999, transition: "all .25s" } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
      MuiOutlinedInput: { styleOverrides: { root: { background: dark ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.85)" } } },
      MuiAccordion: { styleOverrides: { root: { ...glass, "&:before": { display: "none" } } } },
    },
  });
};
export const gradBtn = { background: "linear-gradient(90deg,#7C3AED,#C026D3)", color: "#fff", boxShadow: "0 8px 24px rgba(124,58,237,.4)",
  "&:hover": { filter: "brightness(1.12)", transform: "translateY(-2px)" }, "&.Mui-disabled": { opacity: .45, color: "#fff" } } as const;
