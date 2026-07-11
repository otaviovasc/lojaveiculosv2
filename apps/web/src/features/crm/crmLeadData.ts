import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import { formatRelativeDate } from "./crmPipelineModels";
import type { ProductCrmLead } from "./productCrmTypes";

export type FinancingSimulationDraft = {
  downpaymentCents: number;
  interestRate: number;
  monthlyPaymentCents: number;
  months: number;
  vehicleValueCents: number;
};

export const financingTermOptions = [12, 24, 36, 48, 60].map((months) => ({
  label: `${months}x`,
  value: String(months),
}));

export const crmPriorityOptions = [
  { label: "Baixa", value: "Baixa" },
  { label: "Média", value: "Média" },
  { label: "Alta", value: "Alta" },
];

export function getLeadStageId(lead: ProductCrmLead) {
  return lead.pipelineStageId ?? readMetadataString(lead.metadata, "stageId");
}

export function getLinkedLeadVehicles(
  lead: ProductCrmLead,
  vehicleOptions: readonly LeadVehicleOption[],
): LeadVehicleOption[] {
  if (!lead.listingId) return [];

  const option = vehicleOptions.find(
    (vehicle) => vehicle.id === lead.listingId,
  );
  if (option) return [option];

  if (!lead.vehicleTitle) return [];

  return [
    {
      detail: "Vinculado ao lead",
      id: lead.listingId,
      label: lead.vehicleTitle,
      imageUrl: null,
      priceCents: null,
      manufactureYear: null,
      modelYear: null,
    },
  ];
}

export function getPrimaryLeadVehiclePriceCents(
  lead: ProductCrmLead,
  vehicleOptions: readonly LeadVehicleOption[],
) {
  return getLinkedLeadVehicles(lead, vehicleOptions)[0]?.priceCents ?? null;
}

export function formatBrlCents(valueCents: number | null | undefined) {
  if (!valueCents) return "Sob consulta";

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valueCents / 100);
}

export function formatLeadOwner(lead: ProductCrmLead) {
  return lead.assignedUserId ? "Responsável atribuído" : "Sem responsável";
}

export function hasAssignedLeadOwner(lead: ProductCrmLead) {
  return Boolean(lead.assignedUserId);
}

export function formatLeadTimelineLabel(lead: ProductCrmLead) {
  if (lead.lastInteractionAt) {
    return `Última interação ${formatRelativeDate(lead.lastInteractionAt)}`;
  }

  return `Criado ${formatRelativeDate(lead.createdAt)}`;
}

export function readMetadataString(
  metadata: Record<string, unknown>,
  key: string,
) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}
