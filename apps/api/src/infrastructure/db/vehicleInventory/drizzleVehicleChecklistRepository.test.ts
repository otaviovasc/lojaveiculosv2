import { describe, expect, it } from "vitest";
import { createDrizzleVehicleInventoryRepositories } from "./drizzleVehicleInventoryRepository.js";
import {
  createFakeDb,
  createRows,
} from "./drizzleVehicleInventoryRepository.testSupport.js";

describe("Drizzle vehicle checklist repository", () => {
  const checklistId = "00000000-0000-4000-8000-000000000011";
  const unitId = "00000000-0000-4000-8000-000000000012";
  const otherChecklistId = "00000000-0000-4000-8000-000000000013";
  const otherUnitId = "00000000-0000-4000-8000-000000000014";

  it("creates, lists, and updates vehicle checklist rows", async () => {
    const rows = createRows();
    const db = createFakeDb({
      checklists: [
        rows.checklist({
          id: checklistId,
          items: [
            {
              id: "item_1",
              label: "Manual",
              notes: null,
              status: "pending",
            },
          ],
          unitId,
        }),
      ],
    });
    const { checklistRepository } =
      createDrizzleVehicleInventoryRepositories(db);

    const created = await checklistRepository.create({
      completedAt: null,
      completedByUserId: null,
      items: [
        {
          id: "item_2",
          label: "Chave reserva",
          notes: null,
          status: "pending",
        },
      ],
      name: "Entrega",
      status: "pending",
      storeId: "store_1",
      tenantId: "tenant_1",
      unitId,
    });
    const listed = await checklistRepository.listByUnitIds({
      storeId: "store_1",
      tenantId: "tenant_1",
      unitIds: [unitId],
    });
    const found = await checklistRepository.findById({
      checklistId,
      listingId: "listing_1",
      storeId: "store_1",
      tenantId: "tenant_1",
      unitId,
    });
    const updated = await checklistRepository.save({
      ...found!,
      completedAt: new Date("2026-01-02T00:00:00.000Z"),
      items: [{ id: "item_1", label: "Manual", notes: null, status: "passed" }],
      status: "passed",
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    expect(created).toMatchObject({ name: "Entrega", unitId });
    expect(listed.map((checklist) => checklist.id)).toContain(checklistId);
    expect(found).toMatchObject({ id: checklistId, status: "pending" });
    expect(updated).toMatchObject({
      id: checklistId,
      items: [{ id: "item_1", label: "Manual", notes: null, status: "passed" }],
      status: "passed",
    });
  });

  it("filters checklist reads by unit, store, and tenant scope", async () => {
    const rows = createRows();
    const db = createFakeDb({
      checklists: [
        rows.checklist({ id: checklistId, unitId }),
        rows.checklist({
          id: otherChecklistId,
          storeId: "store_2",
          unitId,
        }),
        rows.checklist({
          id: "00000000-0000-4000-8000-000000000015",
          unitId: otherUnitId,
        }),
      ],
    });
    const { checklistRepository } =
      createDrizzleVehicleInventoryRepositories(db);

    const listed = await checklistRepository.listByUnitIds({
      storeId: "store_1",
      tenantId: "tenant_1",
      unitIds: [unitId],
    });
    const wrongStore = await checklistRepository.findById({
      checklistId: otherChecklistId,
      listingId: "listing_1",
      storeId: "store_1",
      tenantId: "tenant_1",
      unitId,
    });
    const wrongUnit = await checklistRepository.findById({
      checklistId,
      listingId: "listing_1",
      storeId: "store_1",
      tenantId: "tenant_1",
      unitId: otherUnitId,
    });

    expect(listed.map((checklist) => checklist.id)).toEqual([checklistId]);
    expect(wrongStore).toBeNull();
    expect(wrongUnit).toBeNull();
  });

  it("does not update checklist rows outside the scoped predicate", async () => {
    const rows = createRows();
    const db = createFakeDb({
      checklists: [
        rows.checklist({
          id: checklistId,
          storeId: "store_2",
          unitId,
        }),
      ],
    });
    const { checklistRepository } =
      createDrizzleVehicleInventoryRepositories(db);

    await expect(
      checklistRepository.save({
        completedAt: null,
        completedByUserId: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        id: checklistId,
        items: [
          { id: "item_1", label: "Manual", notes: null, status: "passed" },
        ],
        name: "Entrega",
        status: "passed",
        storeId: "store_1",
        tenantId: "tenant_1",
        unitId,
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      }),
    ).rejects.toThrow("Vehicle checklist write returned no row.");
  });
});
