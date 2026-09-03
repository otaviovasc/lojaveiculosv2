import { useMemo } from "react";
import { ReceiptText } from "lucide-react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { SalesModule } from "../sales/SalesModule";
import type { SaleStartContext } from "../sales/types";
import { formatLeadName } from "./crmPipelineModels";
import type { ProductCrmLead } from "./productCrmTypes";

type Props = {
  lead?: ProductCrmLead;
  context?: SaleStartContext;
  onClose: () => void;
  saleId?: string | null;
  title?: string;
};

export function LeadSaleModal({
  context,
  lead,
  onClose,
  saleId,
  title,
}: Props) {
  const leadName = lead ? formatLeadName(lead) : undefined;

  const initialContext: SaleStartContext = useMemo(() => {
    if (context) return context;
    if (!lead) return {};
    return {
      customerDisplayName: lead.buyerName || undefined,
      customerPhone: lead.buyerPhone || undefined,
      leadId: lead.id,
      listingId: lead.listingId || undefined,
      listingTitle: lead.vehicleTitle || undefined,
      sellerUserId: lead.assignedUserId || undefined,
    };
  }, [context, lead]);

  const modalTitle =
    title ??
    (saleId
      ? "Detalhe da Venda"
      : leadName
        ? `Nova Venda · ${leadName}`
        : initialContext.listingTitle
          ? `Nova Venda · ${initialContext.listingTitle}`
          : "Nova Venda");

  return (
    <FeatureDialog
      className="feature-dialog--large max-w-6xl crm-sale-lead-dialog"
      description="Gerencie proposta comercial, negociação, serviços, comissões, pagamentos e fechamento da venda."
      icon={<ReceiptText aria-hidden="true" className="size-5 text-accent" />}
      isOpen
      onClose={onClose}
      title={modalTitle}
    >
      <div className="flex-1 min-h-[550px] flex flex-col w-full overflow-y-auto">
        <SalesModule
          embedded
          initialContext={saleId ? null : initialContext}
          initialSaleId={saleId}
          onCloseWorkspace={onClose}
        />
      </div>
    </FeatureDialog>
  );
}
