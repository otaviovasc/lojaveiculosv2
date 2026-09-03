import { useMemo } from "react";
import { Landmark } from "lucide-react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { SimulationsPage } from "../simulations/SimulationsPage";
import type { SimulationPrefill } from "../simulations/SimulationForm";
import { formatLeadName } from "./crmPipelineModels";
import { getPrimaryLeadVehiclePriceCents } from "./crmLeadData";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { ProductCrmLead } from "./productCrmTypes";

type Props = {
  lead?: ProductCrmLead;
  onClose: () => void;
  vehicleOptions?: LeadVehicleOption[];
  prefill?: SimulationPrefill;
  title?: string;
};

export function LeadFinancingSimulationModal({
  lead,
  onClose,
  vehicleOptions,
  prefill: directPrefill,
  title,
}: Props) {
  const leadName = lead ? formatLeadName(lead) : undefined;
  const vehiclePriceCents =
    lead && vehicleOptions
      ? getPrimaryLeadVehiclePriceCents(lead, vehicleOptions)
      : undefined;

  const prefill: SimulationPrefill = useMemo(() => {
    if (directPrefill) return directPrefill;
    if (!lead) return {};
    return {
      cpf:
        typeof lead.metadata?.cpf === "string" ? lead.metadata.cpf : undefined,
      email: lead.buyerEmail || undefined,
      leadId: lead.id,
      leadName: lead.buyerName || undefined,
      leadPhone: lead.buyerPhone || undefined,
      listingId: lead.listingId || undefined,
      vehiclePriceCents: vehiclePriceCents ?? undefined,
      vehicleTitle: lead.vehicleTitle || undefined,
    };
  }, [directPrefill, lead, vehiclePriceCents]);

  const modalTitle =
    title ??
    (leadName
      ? `Simulação de Financiamento · ${leadName}`
      : prefill.vehicleTitle
        ? `Simulação de Financiamento · ${prefill.vehicleTitle}`
        : "Simulação de Financiamento");

  return (
    <FeatureDialog
      className="feature-dialog--large max-w-6xl crm-simulation-lead-dialog"
      description="Consulte limites, condições e simule financiamento com os bancos oficiais integrados via Credere."
      icon={<Landmark aria-hidden="true" className="size-5 text-accent" />}
      isOpen
      onClose={onClose}
      title={modalTitle}
    >
      <div className="flex-1 min-h-[520px] flex flex-col w-full overflow-y-auto">
        <SimulationsPage embedded prefill={prefill} />
      </div>
    </FeatureDialog>
  );
}
