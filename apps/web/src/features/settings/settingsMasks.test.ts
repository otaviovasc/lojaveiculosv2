import { describe, expect, it } from "vitest";
import {
  formatBrazilianDocument,
  formatBrazilianPhone,
  formatBrazilianZipCode,
  normalizePublicSlug,
} from "./settingsMasks";

describe("settings masks", () => {
  it("formats CPF and CNPJ documents", () => {
    expect(formatBrazilianDocument("12345678901")).toBe("123.456.789-01");
    expect(formatBrazilianDocument("12345678000190")).toBe(
      "12.345.678/0001-90",
    );
  });

  it("formats Brazilian phone numbers", () => {
    expect(formatBrazilianPhone("11987654321")).toBe("(11) 98765-4321");
    expect(formatBrazilianPhone("551132345678")).toBe("(11) 3234-5678");
  });

  it("formats CEP values", () => {
    expect(formatBrazilianZipCode("01310930")).toBe("01310-930");
  });

  it("normalizes public slugs", () => {
    expect(normalizePublicSlug("Loja Sao Jose!!!")).toBe("loja-sao-jose");
  });
});
