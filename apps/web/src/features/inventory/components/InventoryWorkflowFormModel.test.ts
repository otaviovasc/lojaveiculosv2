import { describe, expect, it } from "vitest";
import type { InventoryListingDetail } from "../model/types";
import { createWorkflowForm } from "./InventoryWorkflowFormModel";

describe("createWorkflowForm", () => {
  it("prefills the selected unit when it belongs to the listing", () => {
    const form = createWorkflowForm(createDetail(), "unit_2");

    expect(form.unitId).toBe("unit_2");
  });

  it("falls back to the first unit when the selected unit is stale", () => {
    const form = createWorkflowForm(createDetail(), "missing_unit");

    expect(form.unitId).toBe("unit_1");
  });
});

function createDetail() {
  return {
    listing: {
      priceCents: 12690000,
    },
    units: [{ id: "unit_1" }, { id: "unit_2" }],
  } as unknown as InventoryListingDetail;
}
