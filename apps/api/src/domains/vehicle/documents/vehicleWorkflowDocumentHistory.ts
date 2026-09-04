import type { VoidVehicleDocumentsBySaleInput } from "../ports/vehicleInventoryRepository.js";

export function appendVehicleDocumentVoidHistory(
  metadata: Record<string, unknown>,
  input: Pick<VoidVehicleDocumentsBySaleInput, "actorId" | "at" | "reason">,
): Record<string, unknown> {
  return {
    ...metadata,
    operationHistory: [
      ...vehicleDocumentOperationHistory(metadata),
      {
        action: "voided",
        actorId: input.actorId,
        at: input.at,
        reason: input.reason,
      },
    ],
  };
}

function vehicleDocumentOperationHistory(metadata: Record<string, unknown>) {
  const value = metadata.operationHistory;
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>).action === "string" &&
      typeof (item as Record<string, unknown>).actorId === "string",
  );
}
