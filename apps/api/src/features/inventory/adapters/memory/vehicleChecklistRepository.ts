import type {
  VehicleChecklist,
  VehicleChecklistRepository,
} from "../../../../domains/vehicle/ports/vehicleChecklistRepository.js";

export function createMemoryVehicleChecklistRepository(): VehicleChecklistRepository {
  const checklists = new Map<string, VehicleChecklist>();
  let sequence = 1;

  return {
    create: async (record) => {
      const checklist = createChecklistRecord(record, sequence);
      sequence += 1;
      checklists.set(checklist.id, checklist);
      return checklist;
    },
    findById: async ({ checklistId, storeId, tenantId, unitId }) => {
      const checklist = checklists.get(checklistId);
      if (!checklist) return null;
      if (checklist.unitId !== unitId) return null;
      if (checklist.storeId !== storeId || checklist.tenantId !== tenantId) {
        return null;
      }
      return checklist;
    },
    listByUnitIds: async ({ storeId, tenantId, unitIds }) =>
      [...checklists.values()]
        .filter((item) => unitIds.includes(item.unitId))
        .filter((item) => item.storeId === storeId)
        .filter((item) => item.tenantId === tenantId),
    save: async (checklist) => {
      const updated = { ...checklist, updatedAt: new Date() };
      checklists.set(updated.id, updated);
      return updated;
    },
  };
}

function createChecklistRecord(
  record: Parameters<VehicleChecklistRepository["create"]>[0],
  sequence: number,
): VehicleChecklist {
  const now = new Date();
  return {
    ...record,
    createdAt: now,
    id: `vehicle_checklist_${sequence}`,
    updatedAt: now,
  };
}
