import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { loginAs, mockApi, renderAt } from "./utils";

const LIKERT = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];
const questions = Array.from({ length: 35 }, (_, i) => ({ id: i + 1, category: i < 27 ? "interest" : "aptitude", dimension: "d", text: `Question number ${i + 1}`, options: i < 27 ? LIKERT : ["a", "b", "c", "d"] }));

describe("assessment pages", () => {
  it("goes through 5 pages of 7 in order and blocks Next until a page is answered", async () => {
    loginAs(); mockApi({ "POST /assessment/start": questions }); renderAt("/assessment");
    await userEvent.click(await screen.findByRole("button", { name: /start assessment/i }));
    for (let page = 1; page <= 4; page++) {
      expect(await screen.findByText(`${page}/5`)).toBeInTheDocument();
      const next = screen.getByRole("button", { name: /^next/i }); expect(next).toBeDisabled();
      for (let q = (page - 1) * 7 + 1; q <= page * 7; q++) await userEvent.click(document.querySelector(`input[name="q${q}"]`)!);
      expect(next).toBeEnabled(); expect(screen.getByText(`${7}/7 answered on this page`)).toBeInTheDocument();
      await userEvent.click(next);
    }
    expect(await screen.findByText("5/5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /finish and see my matches/i })).toBeDisabled();
    expect(screen.getByText(/Question number 29$/)).toBeInTheDocument();
  });
  it("Back keeps earlier answers", async () => {
    loginAs(); mockApi({ "POST /assessment/start": questions }); renderAt("/assessment");
    await userEvent.click(await screen.findByRole("button", { name: /start assessment/i }));
    for (let q = 1; q <= 7; q++) await userEvent.click(document.querySelector(`input[name="q${q}"]`)!);
    await userEvent.click(screen.getByRole("button", { name: /^next/i })); await userEvent.click(await screen.findByRole("button", { name: /back/i }));
    expect(await screen.findByText("7/7 answered on this page")).toBeInTheDocument();
  });
});
