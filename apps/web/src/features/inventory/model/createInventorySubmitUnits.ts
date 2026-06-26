import type { InventoryApi } from "../api/apiClient";
import { createInventoryFlowInput } from "./formModel";
import type { InventoryCreateSubmitProgress } from "./createInventorySubmitTypes";
import type { InventoryFormState } from "./formModel";
import type {
  CreateInventoryUnitInput,
  InventoryListingDetail,
  InventoryUnit,
} from "./types";

type ProgressHandler = (progress: InventoryCreateSubmitProgress) => void;

export async function attachInventoryUnits({
  api,
  detail,
  listingId,
  onProgress,
  units,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  listingId: string;
  onProgress: ProgressHandler;
  units: readonly CreateInventoryUnitInput[];
}) {
  let updated = detail;
  const seenUnitIds = new Set(detail.units.map((unit) => unit.id));
  const unitDraftIds = new Map<string, string>();

  for (const [index, unit] of units.entries()) {
    onProgress({
      label:
        units.length > 1
          ? `Vinculando unidade ${index + 1}/${units.length}`
          : "Vinculando unidade",
    });
    updated = await api.attachUnit(listingId, unit);
    const attachedUnit = findAttachedUnit(updated.units, seenUnitIds, index);
    if (attachedUnit) {
      seenUnitIds.add(attachedUnit.id);
      unitDraftIds.set(String(index), attachedUnit.id);
    }
  }

  return { detail: updated, unitDraftIds };
}

export async function ensureInventoryUnitAttached({
  api,
  detail,
  form,
  listingId,
  onProgress,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  form: InventoryFormState;
  listingId: string;
  onProgress: ProgressHandler;
}) {
  const input = createInventoryFlowInput(form, null);
  const pendingUnits = listPendingUnits(detail, input.units ?? [input.unit]);

  if (pendingUnits.length === 0) {
    return { detail, unitDraftIds: attachedUnitDraftIds(detail) };
  }

  return attachInventoryUnits({
    api,
    detail,
    listingId,
    onProgress,
    units: pendingUnits,
  });
}

export function createUnitFailureMessage(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);

  return `Estoque salvo, mas a unidade operacional nao foi vinculada. ${detail}`;
}

export function unitIdForDraft(
  item: { unitDraftId?: string | null },
  unitDraftIds: ReadonlyMap<string, string>,
  detail: InventoryListingDetail,
) {
  const unitId =
    (item.unitDraftId ? unitDraftIds.get(item.unitDraftId) : null) ??
    detail.units[0]?.id;

  if (!unitId) {
    throw new Error(
      "Nenhuma unidade operacional disponivel para anexar midia.",
    );
  }

  return unitId;
}

export function attachedUnitDraftIds(detail: InventoryListingDetail) {
  return new Map(detail.units.map((unit, index) => [String(index), unit.id]));
}

function listPendingUnits(
  detail: InventoryListingDetail,
  expectedUnits: readonly CreateInventoryUnitInput[],
) {
  const existingCounts = new Map<string, number>();
  for (const unit of detail.units) {
    const key = unitColorKey(unit);
    existingCounts.set(key, (existingCounts.get(key) ?? 0) + 1);
  }

  return expectedUnits.filter((unit) => {
    const key = unitColorKey(unit);
    const count = existingCounts.get(key) ?? 0;
    if (count <= 0) return true;
    existingCounts.set(key, count - 1);
    return false;
  });
}

function unitColorKey(input: { colorName?: string | null }) {
  return input.colorName ?? "";
}

function findAttachedUnit(
  units: readonly InventoryUnit[],
  seenUnitIds: ReadonlySet<string>,
  index: number,
) {
  return (
    units.find((unit) => !seenUnitIds.has(unit.id)) ?? units[index] ?? null
  );
}
