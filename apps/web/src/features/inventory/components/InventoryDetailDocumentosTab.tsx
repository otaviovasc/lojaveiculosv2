import { DocumentosUploadCard } from "./DocumentosUploadCard";
import { DocumentosContratosCard } from "./DocumentosContratosCard";
import { DocumentosRenaveCard } from "./DocumentosRenaveCard";
import { DocumentosChecklistCard } from "./DocumentosChecklistCard";
import type { InventoryListingDetail } from "../model/types";

export function InventoryDetailDocumentosTab({
  detail,
}: {
  detail: InventoryListingDetail;
}) {
  return (
    <div className="flex flex-col gap-8 w-full max-w-none text-app-text">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* Left Column: Document Upload, Contratos, Gerar Contrato */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <DocumentosUploadCard />
          <DocumentosContratosCard detail={detail} />
        </div>

        {/* Right Column: Fluxo RENAVE, Checklist */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <DocumentosRenaveCard />
          <DocumentosChecklistCard />
        </div>
      </div>
    </div>
  );
}
