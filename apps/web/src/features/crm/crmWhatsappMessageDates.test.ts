import { describe, expect, it } from "vitest";
import { formatWhatsappMessageDay } from "./crmWhatsappMessageDates";

describe("formatWhatsappMessageDay", () => {
  const now = new Date("2026-07-12T15:00:00.000Z");

  it.each([
    ["2026-07-12T10:00:00.000Z", "Hoje"],
    ["2026-07-11T10:00:00.000Z", "Ontem"],
    ["2026-07-07T10:00:00.000Z", "07/07/2026"],
  ])("formats %s as %s", (value, expected) => {
    expect(formatWhatsappMessageDay(value, now)).toBe(expected);
  });
});
