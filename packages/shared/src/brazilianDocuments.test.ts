import { describe, expect, it } from "vitest";
import {
  formatBrazilianCnpj,
  isValidBrazilianCnpj,
} from "./brazilianDocuments.js";

describe("Brazilian CNPJ helpers", () => {
  it("formats digits and truncates extra input", () => {
    expect(formatBrazilianCnpj("04252011000110")).toBe("04.252.011/0001-10");
    expect(formatBrazilianCnpj("04.252.011/0001-10 extra 99")).toBe(
      "04.252.011/0001-10",
    );
  });

  it.each(["04.252.011/0001-10", "11.222.333/0001-81"])(
    "accepts a valid CNPJ: %s",
    (value) => {
      expect(isValidBrazilianCnpj(value)).toBe(true);
    },
  );

  it.each(["", "123", "00.000.000/0000-00", "04.252.011/0001-11"])(
    "rejects an invalid CNPJ: %s",
    (value) => {
      expect(isValidBrazilianCnpj(value)).toBe(false);
    },
  );
});
