import { describe, expect, it } from "vitest";
import {
  saoPauloBusinessDayRange,
  saoPauloBusinessDayStart,
} from "./saoPauloBusinessDay.js";

describe("São Paulo business-day boundaries", () => {
  it("maps a modern local date to a half-open UTC instant range", () => {
    expect(
      saoPauloBusinessDayRange({ from: "2026-08-22", to: "2026-08-22" }),
    ).toEqual({
      from: "2026-08-22T03:00:00.000Z",
      toExclusive: "2026-08-23T03:00:00.000Z",
    });
  });

  it("uses the zone transition instead of assuming every day is 24 hours", () => {
    expect(
      saoPauloBusinessDayRange({ from: "2018-11-04", to: "2018-11-04" }),
    ).toEqual({
      from: "2018-11-04T03:00:00.000Z",
      toExclusive: "2018-11-05T02:00:00.000Z",
    });
  });

  it("rejects impossible date-only inputs", () => {
    expect(() => saoPauloBusinessDayStart("2026-02-30")).toThrow(RangeError);
  });
});
