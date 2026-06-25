import { vi } from "vitest";
import type {
  VehicleChecklist,
  VehicleChecklistRepository,
} from "./ports/vehicleChecklistRepository.js";

export type TestVehicleChecklistRepository = VehicleChecklistRepository & {
  checklists: Map<string, VehicleChecklist>;
};

export function createTestVehicleChecklistRepository(): TestVehicleChecklistRepository {
  const checklists = new Map<string, VehicleChecklist>();
  let sequence = 1;

  return {
    checklists,
    create: vi.fn(async (record) => {
      const now = new Date("2026-01-01T00:00:00.000Z");
      const checklist: VehicleChecklist = {
        ...record,
        createdAt: now,
        id: `vehicle_checklist_${sequence}`,
        updatedAt: now,
      };
      sequence += 1;
      checklists.set(checklist.id, checklist);
      return checklist;
    }),
    findById: vi.fn(async ({ checklistId, storeId, tenantId, unitId }) => {
      const checklist = checklists.get(checklistId);
      if (!checklist) return null;
      if (checklist.unitId !== unitId) return null;
      if (checklist.storeId !== storeId || checklist.tenantId !== tenantId) {
        return null;
      }
      return checklist;
    }),
    listByUnitIds: vi.fn(async ({ storeId, tenantId, unitIds }) =>
      [...checklists.values()]
        .filter((checklist) => unitIds.includes(checklist.unitId))
        .filter((checklist) => checklist.storeId === storeId)
        .filter((checklist) => checklist.tenantId === tenantId),
    ),
    save: vi.fn(async (checklist) => {
      const updated = { ...checklist, updatedAt: new Date() };
      checklists.set(updated.id, updated);
      return updated;
    }),
  };
}
