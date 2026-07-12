import { describe, expect, it } from "vitest";
import { formatCurrencyValue, parseCurrencyInput } from "./masks";

describe("currency input helpers", () => {
  it.each([
    ["", ""],
    ["abc", ""],
    ["1", "0.01"],
    ["1,23", "1.23"],
    ["R$ 1.234,56", "1234.56"],
    ["000001", "0.01"],
  ])("normalizes %j into canonical decimal input", (input, expected) => {
    expect(parseCurrencyInput(input)).toBe(expected);
  });

  it("rejects unsafe pasted amounts instead of losing cent precision", () => {
    expect(parseCurrencyInput("9".repeat(30))).toBe("");
  });

  it.each([
    ["", ""],
    [0, "0,00"],
    [1.2, "1,20"],
    ["1234.56", "1.234,56"],
    ["-15.4", "-15,40"],
  ])("formats %j as a BRL value without a prefix", (input, expected) => {
    expect(formatCurrencyValue(input)).toBe(expected);
  });

  it.each([" ", "12abc", Number.NaN, Number.POSITIVE_INFINITY])(
    "does not render invalid persisted values (%j) as zero",
    (input) => {
      expect(formatCurrencyValue(input)).toBe("");
    },
  );
});
