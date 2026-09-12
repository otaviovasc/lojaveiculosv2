// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  isValidPeriod,
  isValidReportDate,
  readReportsViewState,
  syncReportsViewState,
} from "./reportPeriod";

describe("report period validation", () => {
  beforeEach(() => window.history.replaceState(null, "", "/admin"));

  it("rejects normalized impossible calendar dates", () => {
    expect(isValidReportDate("2026-02-31")).toBe(false);
    expect(isValidPeriod({ from: "2026-02-01", to: "2026-02-31" })).toBe(false);
  });

  it("accepts leap day only in a leap year", () => {
    expect(isValidReportDate("2024-02-29")).toBe(true);
    expect(isValidReportDate("2026-02-29")).toBe(false);
  });

  it("normalizes an invalid custom URL range to the fallback preset", () => {
    window.history.replaceState(
      null,
      "",
      "/admin?period=custom&from=2026-02-01&to=2026-02-31",
    );

    const state = readReportsViewState(new Date("2026-03-10T12:00:00.000Z"));

    expect(state).toMatchObject({
      customPeriod: { from: "2026-02-09", to: "2026-03-10" },
      preset: "30d",
    });
  });

  it("preserves the window location hash when synchronizing view state", () => {
    window.history.replaceState(null, "", "/dashboard#/reports");

    syncReportsViewState({
      compare: false,
      customPeriod: { from: "2026-06-01", to: "2026-06-30" },
      preset: "30d",
      search: "",
      tab: "summary",
    });

    expect(window.location.hash).toBe("#/reports");
    expect(window.location.search).toBe("?tab=summary&period=30d");
    expect(window.location.pathname).toBe("/dashboard");
  });
});
