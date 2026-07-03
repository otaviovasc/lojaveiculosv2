import type { CustomSelectOption } from "../../../components/ui/CustomSelect";
import type {
  CreateVehicleSupplierInput,
  UpsertVehicleUnitAcquisitionInput,
  VehicleAcquisitionChannel,
  VehicleAcquisitionCommissionTiming,
  VehicleSupplier,
  VehicleSupplierKind,
  VehicleUnitAcquisition,
} from "../model/types";

export type SupplierDraft = CreateVehicleSupplierInput;

export type AcquisitionDraft = Omit<
  UpsertVehicleUnitAcquisitionInput,
  "acquisitionPriceCents"
> & {
  priceDraft: string;
};

export const emptySupplierDraft: SupplierDraft = {
  displayName: "",
  kind: "company",
};

export const emptyAcquisitionDraft: AcquisitionDraft = {
  channel: "supplier_company",
  commissionTiming: "closed",
  priceDraft: "",
  supplierId: null,
};

export const supplierKindOptions: CustomSelectOption<VehicleSupplierKind>[] = [
  { label: "Lead / troca", value: "lead" },
  { label: "Pessoa física", value: "person" },
  { label: "Empresa", value: "company" },
  { label: "Provedor", value: "provider" },
  { label: "Parceiro", value: "partner" },
  { label: "Leilão", value: "auction" },
  { label: "Outro", value: "other" },
];

export const channelOptions: CustomSelectOption<VehicleAcquisitionChannel>[] = [
  { label: "Troca de lead", value: "trade_in_lead" },
  { label: "Pessoa direta", value: "direct_person" },
  { label: "Fornecedor CNPJ", value: "supplier_company" },
  { label: "Auto Avaliar", value: "auto_avaliar" },
  { label: "Parceiro repasse", value: "repasse_partner" },
  { label: "Leilão", value: "auction" },
  { label: "Consignação", value: "consignment" },
  { label: "Marketplace", value: "marketplace" },
  { label: "Outro", value: "other" },
];

export const commissionOptions: CustomSelectOption<VehicleAcquisitionCommissionTiming>[] =
  [
    { label: "Na aquisição", value: "acquisition" },
    { label: "Na reserva", value: "reserve" },
    { label: "Na venda", value: "closed" },
  ];

export function fromSupplier(supplier: VehicleSupplier): SupplierDraft {
  return {
    displayName: supplier.displayName,
    documentNumber: supplier.documentNumber,
    email: supplier.email,
    externalProviderId: supplier.externalProviderId,
    kind: supplier.kind,
    phone: supplier.phone,
    provider: supplier.provider,
  };
}

export function fromAcquisition(
  acquisition: VehicleUnitAcquisition | null,
): AcquisitionDraft {
  if (!acquisition) return emptyAcquisitionDraft;
  return {
    acquisitionDate: acquisition.acquisitionDate?.slice(0, 10) ?? null,
    acquisitionUserId: acquisition.acquisitionUserId,
    channel: acquisition.channel,
    commissionTiming: acquisition.commissionTiming,
    customChannelLabel: acquisition.customChannelLabel,
    leadId: acquisition.leadId,
    notes: acquisition.notes,
    priceDraft: formatCents(acquisition.acquisitionPriceCents),
    supplierId: acquisition.supplierId,
  };
}

export function cleanSupplierDraft(
  input: SupplierDraft,
): CreateVehicleSupplierInput {
  return {
    displayName: input.displayName.trim(),
    documentNumber: textOrNull(input.documentNumber),
    email: textOrNull(input.email),
    externalProviderId: textOrNull(input.externalProviderId),
    kind: input.kind,
    phone: textOrNull(input.phone),
    provider: textOrNull(input.provider),
  };
}

export function cleanAcquisitionDraft(
  input: AcquisitionDraft,
): UpsertVehicleUnitAcquisitionInput {
  return {
    acquisitionDate: textOrNull(input.acquisitionDate),
    acquisitionPriceCents: parseCents(input.priceDraft),
    acquisitionUserId: textOrNull(input.acquisitionUserId),
    channel: input.channel,
    commissionTiming: input.commissionTiming ?? "closed",
    customChannelLabel: textOrNull(input.customChannelLabel),
    leadId: textOrNull(input.leadId),
    notes: textOrNull(input.notes),
    supplierId: textOrNull(input.supplierId),
  };
}

export function upsertSupplier(
  suppliers: readonly VehicleSupplier[],
  supplier: VehicleSupplier,
) {
  const exists = suppliers.some((item) => item.id === supplier.id);
  return exists
    ? suppliers.map((item) => (item.id === supplier.id ? supplier : item))
    : [supplier, ...suppliers];
}

function textOrNull(value: string | null | undefined) {
  const text = value?.trim();
  return text ? text : null;
}

function parseCents(value: string) {
  const text = value.trim();
  if (!text) return null;
  const normalized = text.replace(/[^\d,.-]/g, "").replace(/\./g, "");
  const amount = Number(normalized.replace(",", "."));
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function formatCents(cents: number | null) {
  if (cents === null) return "";
  return (cents / 100).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}
