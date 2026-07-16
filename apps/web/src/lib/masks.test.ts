import { describe, expect, it } from "vitest";
import {
  formatBrazilianCpf,
  formatBrazilianDocument,
  formatBrazilianPhone,
  formatBrazilianZipCode,
  formatCurrencyValue,
  parseCurrencyInput,
} from "./masks";

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

describe("Brazilian contact masks", () => {
  it.each([
    ["12345678901", "123.456.789-01"],
    ["11222333000181", "11.222.333/0001-81"],
    ["11.222.333/0001-81 extra", "11.222.333/0001-81"],
  ])("formats document %j", (input, expected) => {
    expect(formatBrazilianDocument(input)).toBe(expected);
  });

  it("keeps CPF-only fields capped at eleven digits", () => {
    expect(formatBrazilianCpf("12345678901234")).toBe("123.456.789-01");
  });

  it.each([
    ["11987654321", "(11) 98765-4321"],
    ["551132345678", "(11) 3234-5678"],
    ["55987654321", "(55) 98765-4321"],
  ])("formats phone %j", (input, expected) => {
    expect(formatBrazilianPhone(input)).toBe(expected);
  });

  it.each([
    ["01310930", "01310-930"],
    ["01310-930 extra", "01310-930"],
  ])("formats zip code %j", (input, expected) => {
    expect(formatBrazilianZipCode(input)).toBe(expected);
  });
});
