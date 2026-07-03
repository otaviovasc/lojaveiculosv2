import { InventoryBadge } from "./InventoryFormParts";
import type { InventoryListingDetail } from "../model/types";
import { kindLabel } from "../../documents/documentLabels";

export function InventoryDocumentList({
  detail,
  unitId,
}: {
  detail: InventoryListingDetail;
  unitId?: string | null;
}) {
  const documents = unitId
    ? detail.documents.filter(
        (document) =>
          document.targetType !== "vehicle_unit" ||
          document.targetId === unitId,
      )
    : detail.documents;

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-line border-dashed bg-panel/30 py-8 text-center">
        <p className="text-xs font-bold text-muted">
          Nenhum documento operacional anexado.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {documents.map((document) => (
        <div
          className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-app p-3"
          key={document.id}
        >
          <span className="truncate text-sm font-black text-app-text">
            {document.title}
          </span>
          <InventoryBadge tone="blue">
            {kindLabel(document.kind)}
          </InventoryBadge>
        </div>
      ))}
    </div>
  );
}
