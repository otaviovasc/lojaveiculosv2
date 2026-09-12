import { describe, expect, it } from "vitest";
import { parsePriceCents } from "./formModel";
import {
  formatInventoryCurrencyInput,
  formatInventoryMileageInput,
  formatInventoryPlateInput,
  formatInventoryRenavamInput,
  formatInventoryVinInput,
  normalizeInventoryCurrencyEntry,
} from "./inventoryInputFormatting";

describe("inventory input formatting", () => {
  it("formats monetary and mileage values as Brazilian numbers", () => {
    expect(formatInventoryCurrencyInput("189900")).toBe("189.900,00");
    expect(formatInventoryCurrencyInput("R$ 1.234,56")).toBe("1.234,56");
    expect(normalizeInventoryCurrencyEntry("125000")).toBe("125.000");
    expect(normalizeInventoryCurrencyEntry("125000,5")).toBe("125.000,5");
    expect(parsePriceCents(normalizeInventoryCurrencyEntry("125000"))).toBe(
      12_500_000,
    );
    expect(formatInventoryMileageInput("32.500 km")).toBe("32.500");
  });

  it("normalizes vehicle identity fields while typing", () => {
    expect(formatInventoryPlateInput("abc-1d23 extra")).toBe("ABC1D23");
    expect(formatInventoryVinInput("9bw zzZ-377-vt004251")).toBe(
      "9BWZZZ377VT004251",
    );
    expect(formatInventoryRenavamInput("001.234.567-89 extra")).toBe(
      "00123456789",
    );
  });

  it("clears formatted numeric fields when no digits remain", () => {
    expect(formatInventoryCurrencyInput("R$ ")).toBe("");
    expect(formatInventoryMileageInput("km")).toBe("");
  });
});
