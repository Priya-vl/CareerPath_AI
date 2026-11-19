import { describe, expect, it, vi } from "vitest";
import { api, auth } from "../api";

describe("api helper", () => {
  it("sends the bearer token", async () => {
    localStorage.setItem("access", "tok");
    const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: 1 }) })); vi.stubGlobal("fetch", f);
    await api("/profile"); expect((f.mock.calls[0] as any)[1].headers.Authorization).toBe("Bearer tok");
  });
  it("turns DRF field errors into a readable message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 400, json: async () => ({ email: ["An account with this email already exists."] }) })));
    await expect(api("/auth/register", "POST", {})).rejects.toThrow("email: An account with this email already exists.");
  });
  it("prefers the detail message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 400, json: async () => ({ detail: "Bad link" }) })));
    await expect(api("/x")).rejects.toThrow("Bad link");
  });
  it("signing out keeps the theme choice", () => {
    localStorage.setItem("mode", "light"); localStorage.setItem("access", "a"); auth.clear();
    expect(localStorage.getItem("mode")).toBe("light"); expect(localStorage.getItem("access")).toBeNull();
  });
});
