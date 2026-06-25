import { randomUUID } from "node:crypto";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  VehicleChecklistItem,
  VehicleChecklistItemStatus,
  VehicleChecklistStatus,
} from "../ports/vehicleChecklistRepository.js";

export type VehicleChecklistItemInput = {
  id?: string | undefined;
  label: string;
  notes?: string | null | undefined;
  status?: VehicleChecklistItemStatus | undefined;
};

export function normalizeChecklistItems(
  items: readonly VehicleChecklistItemInput[],
): readonly VehicleChecklistItem[] {
  if (items.length === 0) {
    throw new VehicleChecklistValidationError("items");
  }

  return items.map((item) => {
    const label = item.label.trim();
    if (!label) throw new VehicleChecklistValidationError("items.label");

    return {
      id: item.id?.trim() || `checklist_item_${randomUUID()}`,
      label,
      notes: item.notes ?? null,
      status: item.status ?? "pending",
    };
  });
}

export function normalizeChecklistName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new VehicleChecklistValidationError("name");
  return normalized;
}

export function resolveChecklistStatus(input: {
  explicitStatus?: VehicleChecklistStatus | undefined;
  items: readonly VehicleChecklistItem[];
}): VehicleChecklistStatus {
  if (input.explicitStatus) return input.explicitStatus;
  if (input.items.some((item) => item.status === "failed")) return "failed";
  if (input.items.every((item) => item.status === "waived")) return "waived";
  if (input.items.every((item) => item.status !== "pending")) return "passed";
  if (input.items.some((item) => item.status !== "pending")) {
    return "in_progress";
  }
  return "pending";
}

export function applyChecklistCompletion<TChecklist extends { status: string }>(
  context: ServiceContext,
  checklist: TChecklist,
): TChecklist & { completedAt: Date | null; completedByUserId: string | null } {
  if (["failed", "passed", "waived"].includes(checklist.status)) {
    return {
      ...checklist,
      completedAt: new Date(),
      completedByUserId: actorUserId(context),
    };
  }

  return { ...checklist, completedAt: null, completedByUserId: null };
}

export class VehicleChecklistValidationError extends Error {
  constructor(fieldName: string) {
    super(`Vehicle checklist requires ${fieldName}`);
    this.name = "VehicleChecklistValidationError";
  }
}

export class VehicleChecklistNotFoundError extends Error {
  constructor(checklistId: string) {
    super(`Vehicle checklist not found: ${checklistId}`);
    this.name = "VehicleChecklistNotFoundError";
  }
}

function actorUserId(context: ServiceContext): string | null {
  if (context.actor.kind !== "user") return null;
  return isUuid(context.actor.id) ? context.actor.id : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
