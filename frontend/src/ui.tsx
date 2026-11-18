import { ReactNode, useEffect, useRef, useState } from "react";
import { Box } from "@mui/material";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Reveal({ children, dir = "up", delay = 0, sx }: { children: ReactNode; dir?: "up" | "left" | "right" | "zoom"; delay?: number; sx?: any }) {
  const ref = useRef<HTMLDivElement>(null); const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el || !("IntersectionObserver" in window)) { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <Box ref={ref} className={`reveal ${dir} ${on ? "in" : ""}`} style={{ ["--d" as any]: `${delay}ms` }} sx={sx}>{children}</Box>;
}

export function Typing({ phrases, speed = 70 }: { phrases: string[]; speed?: number }) {
  const [i, setI] = useState(0); const [n, setN] = useState(reduced() ? 999 : 0); const [del, setDel] = useState(false);
  useEffect(() => {
    if (reduced()) return;
    const p = phrases[i]; let t: any;
    if (!del && n < p.length) t = setTimeout(() => setN(n + 1), speed);
    else if (!del) t = setTimeout(() => setDel(true), 1400);
    else if (n > 0) t = setTimeout(() => setN(n - 1), speed / 2);
    else { setDel(false); setI((i + 1) % phrases.length); }
    return () => clearTimeout(t);
  }, [n, del, i]);
  return <span>{phrases[i].slice(0, n)}<span className="caret" aria-hidden /></span>;
}

export function Tilt({ children, sx }: { children: ReactNode; sx?: any }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.MouseEvent) => {
    const el = ref.current; if (!el || reduced()) return; const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateY(-4px)`;
  };
  const leave = () => { if (ref.current) ref.current.style.transform = ""; };
  return <Box ref={ref} onMouseMove={move} onMouseLeave={leave} sx={{ transition: "transform .2s ease-out", height: "100%", ...sx }}>{children}</Box>;
}

export function useParallax(factor: number) {
  const [y, setY] = useState(0);
  useEffect(() => {
    if (reduced()) return; let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setY(window.scrollY * factor)); };
    window.addEventListener("scroll", on, { passive: true }); return () => window.removeEventListener("scroll", on);
  }, [factor]);
  return y;
}

export function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null); const [v, setV] = useState(reduced() ? to : 0);
  useEffect(() => {
    const el = ref.current; if (!el || reduced()) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect(); const t0 = performance.now();
      const tick = (t: number) => { const k = Math.min(1, (t - t0) / 1200); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }); io.observe(el); return () => io.disconnect();
  }, [to]);
  return <span ref={ref}>{v}</span>;
}

export function Spinner({ label }: { label?: string }) {
  return <Box role="status" sx={{ display: "grid", placeItems: "center", gap: 2, py: 6 }}><div className="spinner" />{label && <Box sx={{ color: "text.secondary" }}>{label}</Box>}</Box>;
}

const P: Record<string, ReactNode> = {
  cap: <><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 2.5 9 2.5 12 0v-5M22 10v6" /></>,
  code: <><path d="m16 18 6-6-6-6M8 6l-6 6 6 6" /></>,
  flask: <><path d="M9 3h6M10 3v6L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 9V3" /></>,
  heart: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></>,
  clipboard: <><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 12h6M9 16h4" /></>,
  chart: <><path d="M3 3v18h18M7 15v3M12 10v8M17 6v12" /></>,
  route: <><circle cx="6" cy="19" r="3" /><circle cx="18" cy="5" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /></>,
  bot: <><rect x="3" y="8" width="18" height="12" rx="3" /><path d="M12 8V4M8 14h.01M16 14h.01M9 18h6" /></>,
  spark: <><path d="m12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  send: <><path d="m22 2-7 20-4-9-9-4zM22 2 11 13" /></>,
};
export function Icon({ name, size = 28 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{P[name]}</svg>;
}
