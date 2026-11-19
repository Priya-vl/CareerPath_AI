import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import App from "../App";
import { ModeProvider } from "../mode";

/** routes: {"GET /pathways": data, "POST /auth/login": data | (init)=>data}. Anything else answers 404. */
export function mockApi(routes: Record<string, any>) {
  const fn = vi.fn(async (url: string, init?: any) => {
    const path = String(url).replace(/^https?:\/\/[^/]+\/api/, "").split("?")[0]; const key = `${init?.method || "GET"} ${path}`;
    const hit = routes[key];
    if (hit === undefined) return { ok: false, status: 404, json: async () => ({ detail: `no mock for ${key}` }) } as any;
    return { ok: true, status: 200, json: async () => (typeof hit === "function" ? hit(init) : hit) } as any;
  });
  vi.stubGlobal("fetch", fn); return fn;
}
export const loginAs = (role = "student") => { localStorage.setItem("access", "t"); localStorage.setItem("refresh", "r"); localStorage.setItem("role", role); };
export function renderAt(path: string) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ModeProvider><MemoryRouter initialEntries={[path]}><App /></MemoryRouter></ModeProvider></QueryClientProvider>);
}
