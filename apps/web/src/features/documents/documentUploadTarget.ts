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
  if (!selectedUnit?.unitId && !selectedUnit?.id) return null;
  return {
    label: selectedUnit.label,
    mode: "vehicle_unit",
    unitId: selectedUnit.unitId ?? selectedUnit.id,
  };
}
