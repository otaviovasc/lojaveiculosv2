import { getVehicleColorLabel } from "@lojaveiculosv2/shared";
import { unmaskCurrency } from "../../../lib/masks";
import type {
  InventoryDocument,
  InventoryListingDetail,
  InventoryUnit,
} from "../model/types";
import type { DriverData, StoreData, VehicleData } from "./InventoryPrintTypes";
import {
  contractPaymentOptions,
  type ContractDraft,
  type ContractForm,
  type ContractTemplateId,
} from "./DocumentosContratosModel";

export type ContractDocumentListItem = {
  date: string;
  id: string;
  status: "Arquivado" | "Assinado" | "Emitido" | "Minuta" | "Pendente";
  title: string;
};

export type ContractPreviewData = {
  buyer: DriverData;
  date: string;
  expiresAt: string;
  notes?: string | undefined;
  paymentMethod: string;
  salePrice: number;
  signalAmount: number;
  store: StoreData;
  templateId: ContractTemplateId;
  vehicle: VehicleData;
};

export function buildContractPreviewData(
  detail: InventoryListingDetail,
  form: ContractForm,
): ContractPreviewData {
  return {
    buyer: {
      address: textOrPlaceholder(form.buyerAddress),
      cpf: textOrPlaceholder(form.buyerDocument),
      email: form.buyerEmail.trim() || undefined,
      name: form.buyerName.trim(),
      phone: form.buyerPhone.trim() || "_____________________",
    },
    date: form.contractDate.trim(),
    expiresAt: form.reservationExpiresAt.trim(),
    notes: form.notes.trim() || undefined,
    paymentMethod: paymentMethodLabel(form.paymentMethod),
    salePrice: moneyReais(form.salePrice),
    signalAmount: moneyReais(form.signalAmount),
    store: {
      cnpj: form.storeDocument.trim(),
      endereco: form.storeAddress.trim(),
      cidade: form.storeCity.trim(),
      estado: form.storeState.trim() || undefined,
      nome: form.storeName.trim(),
      telefone: form.storePhone.trim() || undefined,
    },
    templateId: form.templateId,
    vehicle: vehiclePrintData(detail, form.unitId),
  };
}

export function createContractDocumentItems(
  documents: readonly InventoryDocument[],
  drafts: readonly ContractDraft[],
): readonly ContractDocumentListItem[] {
  const stored = documents.flatMap((document): ContractDocumentListItem[] => {
    if (!isContractDocument(document)) return [];

    return [
      {
        date: formatDocumentDate(document.uploadedAt || document.createdAt),
        id: document.id,
        status: statusLabel(document.status),
        title: document.title || document.fileName,
      },
    ];
  });

  return [...drafts, ...stored];
}

export function createContractUnitOptions(units: readonly InventoryUnit[]) {
  return units.map((unit, index) => ({
    label: unitLabel(unit, index),
    value: unit.id,
  }));
}

function moneyReais(value: string) {
  return unmaskCurrency(value) / 100;
}

function paymentMethodLabel(value: string) {
  return (
    contractPaymentOptions.find((option) => option.value === value)?.label ??
    "Conforme acordado"
  );
}

function vehiclePrintData(
  detail: InventoryListingDetail,
  unitId: string,
): VehicleData {
  const unit =
    detail.units.find((candidate) => candidate.id === unitId) ??
    detail.units[0] ??
    null;

  return {
    title: detail.listing.title,
    brand: detail.listing.catalog?.brandName || "",
    model: detail.listing.catalog?.modelName || "",
    version: detail.listing.trimName || undefined,
    yearFabrication: detail.listing.manufactureYear ?? undefined,
    yearModel: detail.listing.modelYear ?? undefined,
    plate: unit?.plate || detail.listing.plate || undefined,
    km: detail.listing.mileageKm ?? undefined,
    color: getVehicleColorLabel(unit?.colorName) || undefined,
    chassi: unit?.vin || undefined,
  };
}

function unitLabel(unit: InventoryUnit, index: number) {
  return (
    [unit.stockNumber, unit.plate, getVehicleColorLabel(unit.colorName)]
      .filter(Boolean)
      .join(" / ") || `Unidade ${index + 1}`
  );
}

function textOrPlaceholder(value: string) {
  return value.trim() || "_____________________";
}

function isContractDocument(document: InventoryDocument) {
  return (
    document.kind === "sale_contract" ||
    document.kind === "sale_receipt" ||
    document.kind === "reservation_receipt"
  );
}

function statusLabel(status: InventoryDocument["status"]) {
  if (status === "signed") return "Assinado";
  if (status === "issued") return "Emitido";
  if (status === "archived" || status === "voided") return "Arquivado";
  if (status === "draft") return "Minuta";
  return "Pendente";
}

function formatDocumentDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("pt-BR");
}
