const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
// NOTE: tokens live in localStorage for simplicity; an httpOnly-cookie flow is safer (see README).
export const auth = {
  get: () => localStorage.getItem("access"),
  set: (a: string, r: string, role: string) => { localStorage.setItem("access", a); localStorage.setItem("refresh", r); localStorage.setItem("role", role); },
  clear: () => ["access", "refresh", "role"].forEach((k) => localStorage.removeItem(k)),
  role: () => localStorage.getItem("role") || "student",
};
export async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch(BASE + path, {
    method, headers: { "Content-Type": "application/json", ...(auth.get() ? { Authorization: `Bearer ${auth.get()}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && auth.get()) { auth.clear(); location.href = "/login"; }
  if (!res.ok) {
    const flat = Object.entries(data).map(([k, v]) => `${k}: ${([] as any[]).concat(v as any).join(" ")}`).join(" · ");
    throw new Error((data as any).detail || flat || "Request failed");
  }
  return data;
}
export const home = (_r: string) => "/";
