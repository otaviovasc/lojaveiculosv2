import { vi } from "vitest";
import type { InventoryListingServices } from "./listingServices.js";
import { listingDetailResult } from "./vehicle.controller.testFixtures.js";

export function createChecklistTestServices(): Pick<
  InventoryListingServices,
  | "createChecklist"
  | "exportChecklistReport"
  | "listChecklists"
  | "listChecklistOverview"
  | "updateChecklist"
> {
  return {
    createChecklist: vi.fn(async () => listingDetailResult()),
    exportChecklistReport: vi.fn(async () => ({
      bytes: new TextEncoder().encode("%PDF-1.7"),
      fileName: "checklists-geral-2026-07-15.pdf",
    })),
    listChecklists: vi.fn(async () => [
      {
        completedAt: null,
        completedByUserId: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        id: "checklist_1",
        items: [
          {
            id: "item_1",
            label: "Manual",
            notes: null,
            status: "passed" as const,
          },
        ],
        name: "Entrega",
        status: "in_progress" as const,
        storeId: "store_1",
        tenantId: "tenant_1",
        unitId: "unit_1",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]),
    listChecklistOverview: vi.fn(async () => ({
      generatedAt: new Date("2026-07-15T12:00:00.000Z"),
      items: [],
      summary: {
        attentionUnitCount: 0,
        checklistCount: 0,
        failedItemCount: 0,
        itemCount: 0,
        missingChecklistUnitCount: 0,
        pendingItemCount: 0,
        progressPercent: 0,
        resolvedItemCount: 0,
        unitCount: 0,
        waivedItemCount: 0,
      },
    })),
    updateChecklist: vi.fn(async () => listingDetailResult()),
  };
}
