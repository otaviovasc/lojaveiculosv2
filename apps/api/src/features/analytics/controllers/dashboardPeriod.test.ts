import { describe, expect, it } from "vitest";
import { parseDashboardPeriod } from "./dashboardPeriod.js";

const NOW = new Date("2026-07-30T15:45:00.000Z");

describe("parseDashboardPeriod", () => {
  it("defaults to the last 30 days when params are missing or invalid", () => {
    expect(parseDashboardPeriod({}, NOW)).toEqual({
      from: "2026-07-01",
      to: "2026-07-30",
    });
    expect(
      parseDashboardPeriod({ from: "30/07/2026", to: "not-a-date" }, NOW),
    ).toEqual({ from: "2026-07-01", to: "2026-07-30" });
  });

  it("accepts explicit YYYY-MM-DD dates", () => {
    expect(
      parseDashboardPeriod({ from: "2026-06-01", to: "2026-06-30" }, NOW),
    ).toEqual({ from: "2026-06-01", to: "2026-06-30" });
  });

  it("swaps inverted dates instead of failing", () => {
    expect(
      parseDashboardPeriod({ from: "2026-06-30", to: "2026-06-01" }, NOW),
    ).toEqual({ from: "2026-06-01", to: "2026-06-30" });
  });

  it("rejects impossible calendar dates", () => {
    expect(
      parseDashboardPeriod({ from: "2026-02-30", to: "2026-13-01" }, NOW),
    ).toEqual({ from: "2026-07-01", to: "2026-07-30" });
  });
});
