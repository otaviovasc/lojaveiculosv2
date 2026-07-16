import { describe, expect, it } from "vitest";
import { createInventoryHeaders, inventoryRoutes } from "./apiClient";

describe("inventory route helpers", () => {
  it("keeps route helpers and headers explicit", () => {
    expect(inventoryRoutes.listings()).toBe("/api/v1/inventory/listings");
    expect(inventoryRoutes.detail("listing 1")).toBe(
      "/api/v1/inventory/listings/listing%201",
    );
    expect(
      inventoryRoutes.list({
        limit: 100,
        offset: 200,
        search: "toro",
        status: "available",
      }),
    ).toBe(
      "/api/v1/inventory/units?limit=100&offset=200&search=toro&status=available",
    );
    expect(inventoryRoutes.unit("listing 1")).toBe(
      "/api/v1/inventory/listings/listing%201/unit",
    );
    expect(inventoryRoutes.unitDetail("unit 1")).toBe(
      "/api/v1/inventory/units/unit%201",
    );
    expect(inventoryRoutes.costs("unit 1")).toBe(
      "/api/v1/inventory/units/unit%201/costs",
    );
    expect(inventoryRoutes.checklists("unit 1")).toBe(
      "/api/v1/inventory/units/unit%201/checklists",
    );
    expect(inventoryRoutes.checklistDetail("unit 1", "checklist 1")).toBe(
      "/api/v1/inventory/units/unit%201/checklists/checklist%201",
    );
    expect(
      inventoryRoutes.checklistOverview({
        scope: "active",
        search: "toro branca",
        status: "attention",
      }),
    ).toBe(
      "/api/v1/inventory/checklists/overview?scope=active&search=toro+branca&status=attention",
    );
    expect(
      inventoryRoutes.checklistReport({ scope: "all", unitId: "unit 1" }),
    ).toBe("/api/v1/inventory/checklists/report.pdf?scope=all&unitId=unit+1");
    expect(inventoryRoutes.unitAcquisition("unit 1")).toBe(
      "/api/v1/inventory/units/unit%201/acquisition",
    );
    expect(inventoryRoutes.unitDocumentUploads("unit 1")).toBe(
      "/api/v1/inventory/units/unit%201/documents/uploads",
    );
    expect(inventoryRoutes.unitDocuments("unit 1")).toBe(
      "/api/v1/inventory/units/unit%201/documents",
    );
    expect(createInventoryHeaders({ storeSlug: "test-store" })).toEqual({
      "Content-Type": "application/json",
      "x-store-slug": "test-store",
    });
  });
});
