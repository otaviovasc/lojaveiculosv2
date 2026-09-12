import { describe, expect, it } from "vitest";
import {
  formatLeadBirthDate,
  isValidLeadBirthDate,
  normalizeLeadBirthDateInput,
} from "./crmLeadBirthDate";

describe("crmLeadBirthDate", () => {
  it("normalizes an optional Brazilian date without changing the canonical ISO shape", () => {
    expect(normalizeLeadBirthDateInput("15/05/1990")).toBe("1990-05-15");
    expect(normalizeLeadBirthDateInput("1990-05-15")).toBe("1990-05-15");
    expect(normalizeLeadBirthDateInput("  ")).toBeNull();
    expect(normalizeLeadBirthDateInput("2026-02-31")).toBeNull();
    expect(normalizeLeadBirthDateInput("2025-02-29")).toBeNull();
  });

  it("rejects impossible and future dates while accepting a valid leap day", () => {
    expect(isValidLeadBirthDate("2000-02-29")).toBe(true);
    expect(isValidLeadBirthDate("2026-02-31")).toBe(false);
    expect(isValidLeadBirthDate("2099-01-01")).toBe(false);
  });

  it("formats stored ISO dates as Brazilian calendar dates without UTC rollover", () => {
    expect(formatLeadBirthDate("1990-05-15")).toBe("15/05/1990");
    expect(formatLeadBirthDate(null)).toBe("Não informado");
  });
});
