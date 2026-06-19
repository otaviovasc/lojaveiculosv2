import { InventoryBadge } from "./InventoryFormParts";
import type { InventoryListingDetail } from "../model/types";

export function InventoryDocumentList({
  detail,
}: {
  detail: InventoryListingDetail;
}) {
  if (detail.documents.length === 0) return null;

  return (
    <div className="grid gap-2">
      {detail.documents.map((document) => (
        <div
          className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-app p-3"
          key={document.id}
        >
          <span className="truncate text-sm font-black text-app-text">
            {document.title}
          </span>
          <InventoryBadge tone="blue">{document.kind}</InventoryBadge>
        </div>
      ))}
    </div>
  );
}
