import { describe, expect, it } from "vitest";
import { mergeEntryMetadata } from "./financeBillsActions";

describe("finance bills actions", () => {
  it("preserves existing integration metadata when editing notes", () => {
    expect(
      mergeEntryMetadata(
        { integrationId: "mkp-1", source: "marketplace", vehicleUnitId: "unit-1" },
        { notes: "Despesa revisada", source: "finance_bills_slice" },
      ),
    ).toEqual({
      integrationId: "mkp-1",
      notes: "Despesa revisada",
      source: "marketplace",
      vehicleUnitId: "unit-1",
    });
  });
});
