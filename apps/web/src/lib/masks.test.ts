import { describe, expect, it } from "vitest";
import {
  applyInputMask,
  formatBrazilianCpf,
  formatBrazilianCnpj,
  formatBrazilianDocument,
  formatBrazilianPixKey,
  formatBrazilianPhone,
  formatBrazilianWhatsappPhone,
  formatBrazilianZipCode,
  formatCurrencyValue,
  normalizeBrazilianPhoneDigits,
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

  it("keeps CNPJ-only fields capped at fourteen digits", () => {
    expect(formatBrazilianCnpj("1122233300018199")).toBe("11.222.333/0001-81");
  });

  it.each([
    ["11987654321", "11987654321"],
    ["119876543219999", "11987654321"],
    ["551132345678", "1132345678"],
    ["+5511", "11"],
    ["55987654321", "55987654321"],
    ["+5555987654321", "55987654321"],
  ])("normalizes phone %j to local canonical digits", (input, expected) => {
    expect(normalizeBrazilianPhoneDigits(input)).toBe(expected);
  });

  it.each([
    ["11987654321", "(11) 98765-4321"],
    ["551132345678", "(11) 3234-5678"],
    ["55987654321", "(55) 98765-4321"],
    ["119876543219999", "(11) 98765-4321"],
  ])("formats phone %j", (input, expected) => {
    expect(formatBrazilianPhone(input)).toBe(expected);
  });

  it.each([
    ["", ""],
    ["11987654321", "+55 (11) 98765-4321"],
    ["551132345678", "+55 (11) 3234-5678"],
    ["55987654321", "+55 (55) 98765-4321"],
    ["119876543219999", "+55 (11) 98765-4321"],
  ])("formats WhatsApp E.164 phone %j", (input, expected) => {
    expect(formatBrazilianWhatsappPhone(input)).toBe(expected);
    expect(formatBrazilianWhatsappPhone(expected)).toBe(expected);
  });

  it("keeps the E.164 mask stable while a controlled input is typed", () => {
    expect(formatBrazilianWhatsappPhone("1")).toBe("+55 1");
    expect(formatBrazilianWhatsappPhone("+55 12")).toBe("+55 12");
    expect(formatBrazilianWhatsappPhone("+55 (11) 9")).toBe("+55 (11) 9");
  });

  it.each([
    ["+551", "+55 1"],
    ["+5511", "+55 11"],
    ["+55119", "+55 (11) 9"],
    ["+5511987654321", "+55 (11) 98765-4321"],
    ["+5555987654321", "+55 (55) 98765-4321"],
  ])(
    "recognizes the explicit +55 prefix without requiring a separator in %j",
    (input, expected) => {
      expect(formatBrazilianWhatsappPhone(input)).toBe(expected);
    },
  );

  it.each([
    ["+5511", "+55 11"],
    ["+5511987654321", "+55 (11) 98765-4321"],
    ["55987654321", "+55 (55) 98765-4321"],
  ])("remains stable after repeated formatting of %j", (input, expected) => {
    let formatted = input;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      formatted = formatBrazilianWhatsappPhone(formatted);
    }
    expect(formatted).toBe(expected);
  });

  it("applies a mask while preserving a collapsed caret by digit position", () => {
    const selection = { start: -1, end: -1 };
    const input = {
      value: "1234",
      selectionStart: 3,
      selectionEnd: 3,
      setSelectionRange(start: number, end: number) {
        selection.start = start;
        selection.end = end;
      },
    };

    expect(applyInputMask(input, formatBrazilianCpf)).toBe("123.4");
    expect(input.value).toBe("123.4");
    expect(selection).toEqual({ start: 4, end: 4 });
  });

  it("defaults a missing selection to the end of the input", () => {
    const selection = { start: -1, end: -1 };
    const input = {
      value: "1234",
      selectionStart: null,
      selectionEnd: null,
      setSelectionRange(start: number, end: number) {
        selection.start = start;
        selection.end = end;
      },
    };

    expect(applyInputMask(input, formatBrazilianCpf)).toBe("123.4");
    expect(selection).toEqual({ start: 5, end: 5 });
  });

  it("keeps a selected digit range aligned after punctuation is inserted", () => {
    const selection = { start: -1, end: -1 };
    const input = {
      value: "123456",
      selectionStart: 3,
      selectionEnd: 5,
      setSelectionRange(start: number, end: number) {
        selection.start = start;
        selection.end = end;
      },
    };

    applyInputMask(input, formatBrazilianCpf);

    expect(input.value).toBe("123.456");
    expect(selection).toEqual({ start: 4, end: 6 });
  });

  it("accounts for the country code inserted by the WhatsApp formatter", () => {
    const selection = { start: -1, end: -1 };
    const input = {
      value: "119",
      selectionStart: 2,
      selectionEnd: 2,
      setSelectionRange(start: number, end: number) {
        selection.start = start;
        selection.end = end;
      },
    };

    applyInputMask(input, formatBrazilianWhatsappPhone);

    expect(input.value).toBe("+55 (11) 9");
    expect(selection).toEqual({ start: 9, end: 9 });
  });

  it.each([
    ["01310930", "01310-930"],
    ["01310-930 extra", "01310-930"],
  ])("formats zip code %j", (input, expected) => {
    expect(formatBrazilianZipCode(input)).toBe(expected);
  });

  it.each([
    ["CPF", "12345678901", "123.456.789-01"],
    ["CNPJ", "11222333000181", "11.222.333/0001-81"],
    ["Celular", "11987654321", "+55 (11) 98765-4321"],
    ["Email", "financeiro@example.com", "financeiro@example.com"],
    ["Aleatoria", "uuid-value", "uuid-value"],
  ])(
    "formats %s PIX keys according to their category",
    (category, input, expected) => {
      expect(formatBrazilianPixKey(input, category)).toBe(expected);
    },
  );
});
