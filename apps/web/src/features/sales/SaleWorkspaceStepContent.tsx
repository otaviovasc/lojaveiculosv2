import { ContextSection } from "./SaleContextSection";
import { DocumentsSection } from "./SaleDocumentsSection";
import { FinalizationSection } from "./SaleFinalizationSection";
import { ReviewSection } from "./SaleReviewSection";
import { ServicesSection } from "./SaleServicesSection";
import type { InventoryApi } from "../inventory/api/apiClient";
import type {
  CreateSaleLeadInput,
  SaleContextOptions,
  SaleLeadOption,
} from "./saleContextOptions";
import type { SaleRecord } from "./types";

export function SaleWorkspaceStepContent({
  contextMessage,
  contextOptions,
  currentStep,
  inventoryApi,
  onCreateLead,
  sale,
  update,
}: {
  contextMessage: string | null;
  contextOptions: SaleContextOptions;
  currentStep: number;
  inventoryApi: InventoryApi | null;
  onCreateLead?: (input: CreateSaleLeadInput) => Promise<SaleLeadOption>;
  sale: SaleRecord;
  update: (updater: (sale: SaleRecord) => SaleRecord) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {currentStep === 0 ? (
        <ContextSection
          contextMessage={contextMessage}
          options={contextOptions}
          sale={sale}
          update={update}
          {...(onCreateLead && { onCreateLead })}
        />
      ) : null}
      {currentStep === 1 ? (
        <ServicesSection
          inventoryApi={inventoryApi}
          sale={sale}
          update={update}
        />
      ) : null}
      {currentStep === 2 ? (
        <DocumentsSection sale={sale} update={update} />
      ) : null}
      {currentStep === 3 ? (
        <div className="flex flex-col gap-4">
          <ReviewSection sale={sale} />
          <FinalizationSection sale={sale} />
        </div>
      ) : null}
    </div>
  );
}
