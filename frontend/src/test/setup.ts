import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); delete document.documentElement.dataset.theme; });
window.matchMedia = window.matchMedia || (((q: string) => ({ matches: false, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false })) as any);
window.scrollTo = (() => {}) as any;
