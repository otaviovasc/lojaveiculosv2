import { describe, expect, it } from "vitest";
import { parseFipePriceCents } from "./fipeVehicleCatalogProvider.js";

describe("FIPE vehicle catalog provider", () => {
  it("parses FIPE BRL values into cents", () => {
    expect(parseFipePriceCents("R$ 72.900,00")).toBe(7290000);
    expect(parseFipePriceCents("R$ 1.234.567,89")).toBe(123456789);
    expect(parseFipePriceCents("")).toBeNull();
  });
});
