import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mockApi, renderAt } from "./utils";

describe("password reset screens", () => {
  it("forgot password asks for an email and shows the neutral confirmation", async () => {
    const f = mockApi({ "POST /auth/password-reset": { detail: "If an account with that email exists, a reset link has been sent." } });
    renderAt("/forgot-password"); await userEvent.type(screen.getByLabelText(/email/i), "a@b.co"); await userEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByText(/reset link has been sent/i)).toBeInTheDocument();
    expect(JSON.parse((f.mock.calls[0] as any)[1].body)).toEqual({ email: "a@b.co" });
  });
  it("reset page blocks mismatched passwords and posts uid + token", async () => {
    const f = mockApi({ "POST /auth/password-reset/confirm": { detail: "Password updated. You can now sign in." } });
    renderAt("/reset-password?uid=abc&token=xyz");
    await userEvent.type(screen.getByLabelText(/^new password/i), "brand-new-pass-9"); await userEvent.type(screen.getByLabelText(/repeat new password/i), "different-pass-1");
    expect(await screen.findByText(/passwords don't match/i)).toBeInTheDocument(); expect(screen.getByRole("button", { name: /save new password/i })).toBeDisabled();
    await userEvent.clear(screen.getByLabelText(/repeat new password/i)); await userEvent.type(screen.getByLabelText(/repeat new password/i), "brand-new-pass-9");
    await userEvent.click(screen.getByRole("button", { name: /save new password/i }));
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
    expect(JSON.parse((f.mock.calls[0] as any)[1].body)).toEqual({ uid: "abc", token: "xyz", password: "brand-new-pass-9" });
  });
  it("login links to forgot password and accepts an email", async () => {
    mockApi({}); renderAt("/login"); expect(screen.getByRole("link", { name: /forgot password/i })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
  });
});
