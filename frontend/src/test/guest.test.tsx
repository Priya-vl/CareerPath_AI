import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockApi, renderAt } from "./utils";

describe("guest experience", () => {
  it("home shows the public landing page", async () => {
    mockApi({ "GET /pathways": [] }); renderAt("/");
    expect(await screen.findByText(/Discover the Right Career/i)).toBeInTheDocument();
  });
  it("assessment shows a preview first, and only asks to log in on Start", async () => {
    mockApi({ "GET /pathways": [] }); renderAt("/assessment");
    expect(screen.getByText(/5 pages, about 7 questions each/i)).toBeInTheDocument();
    expect(screen.queryByText(/Welcome/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: /^start assessment/i }));
    expect(await screen.findByText(/Please sign in to use this part of the app/i)).toBeInTheDocument();
  });
  it.each([["/careers", /previewing this page/i], ["/roadmap", /previewing this page/i], ["/assistant", /previewing this page/i]])("%s is a preview, not a redirect", async (path, text) => {
    mockApi({ "GET /pathways": [{ id: "pcm", name: "Science (PCM)", color: "#3B5BFF", summary: "s", subjects: [], after10: "a", degrees: [] }] }); renderAt(path);
    expect(await screen.findByText(text)).toBeInTheDocument();
  });
  it("profile still requires login", async () => {
    mockApi({}); renderAt("/profile"); expect(await screen.findByText(/Welcome/i)).toBeInTheDocument();
  });
  it("theme toggle switches between dark and light", async () => {
    mockApi({ "GET /pathways": [] }); renderAt("/");
    await userEvent.click(screen.getByRole("button", { name: /switch to light theme/i }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));
    expect(localStorage.getItem("mode")).toBe("light");
  });
});
