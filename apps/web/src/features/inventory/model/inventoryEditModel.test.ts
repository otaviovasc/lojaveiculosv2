import { describe, expect, it } from "vitest";
import { createInventoryDetailFixture } from "./inventoryDetail.testSupport";
import {
  createInventoryEditState,
  validateInventoryEditState,
} from "./inventoryEditModel";

describe("inventory edit model", () => {
  it.each([
    ["manufactureYear", "1800", "ano de fabricação"],
    ["modelYear", "2101", "ano do modelo"],
    ["mileageKm", "-1", "quilometragem"],
    ["doors", "0", "portas"],
    ["doors", "13", "portas"],
  ] as const)("mirrors backend limits for %s", (field, value, message) => {
    const detail = createInventoryDetailFixture();
    const form = createInventoryEditState(detail, detail.units[0] ?? null);

    expect(validateInventoryEditState({ ...form, [field]: value })).toContain(
      message,
    );
  });

  it("accepts empty optional technical fields", () => {
    const detail = createInventoryDetailFixture();
    const form = createInventoryEditState(detail, detail.units[0] ?? null);

    expect(
      validateInventoryEditState({
        ...form,
        doors: "",
        manufactureYear: "",
        mileageKm: "",
        modelYear: "",
      }),
    ).toBeNull();
  });
});
