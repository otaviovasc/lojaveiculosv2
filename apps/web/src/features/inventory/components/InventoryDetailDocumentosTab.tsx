import { DocumentosUploadCard } from "./DocumentosUploadCard";
import { DocumentosContratosCard } from "./DocumentosContratosCard";
import { DocumentosRenaveCard } from "./DocumentosRenaveCard";
import { DocumentosChecklistCard } from "./DocumentosChecklistCard";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryListingDetail, InventoryUnit } from "../model/types";

export function InventoryDetailDocumentosTab({
  api,
  detail,
  onUpdated,
  unit,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  onUpdated: (detail: InventoryListingDetail) => void;
  unit: InventoryUnit | null;
}) {
  return (
    <div className="flex flex-col gap-8 w-full max-w-none text-app-text">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* Left Column: uploads and canonical contract handoff */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <DocumentosUploadCard
            api={api}
            detail={detail}
            onUpdated={onUpdated}
            unit={unit}
          />
          <DocumentosContratosCard detail={detail} unitId={unit?.id ?? null} />
        </div>

        {/* Right Column: Fluxo RENAVE, Checklist */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <DocumentosRenaveCard />
          <DocumentosChecklistCard
            api={api}
            detail={detail}
            onUpdated={onUpdated}
            unit={unit}
          />
        </div>
      </div>
    </div>
  );
}
