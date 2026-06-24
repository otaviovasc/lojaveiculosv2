import type {
  DocumentsFolderKey,
  DocumentVehicleOption,
} from "./documentDisplayModel";
import type { DocumentUploadTarget } from "./DocumentUploadDialog";

export function resolveDocumentUploadTarget(
  folderKey: DocumentsFolderKey | null,
  selectedUnit: DocumentVehicleOption | null | undefined,
): DocumentUploadTarget | null {
  if (folderKey === "general") return { label: "Geral", mode: "general" };
  if (!selectedUnit?.listingId) return null;
  return {
    label: selectedUnit.label,
    listingId: selectedUnit.listingId,
    mode: "vehicle_unit",
    targetId: selectedUnit.unitId ?? selectedUnit.id,
    targetType: "vehicle_unit",
  };
}
