import {
  createEmptyIssueDraft,
  createEmptyIssueItem,
  type FiscalIssueDraft,
  type FiscalIssueItem,
  type IssuePayment,
} from "./fiscalIssueModel";
import type { FiscalDocument, VehicleNfeVehicle } from "./types";
import { asRecord, numberValue, stringValue } from "./fiscalDocumentDisplay";

/**
 * Rebuilds a `FiscalIssueDraft` from a persisted fiscal document, using the
 * metadata recorded at emission time (`buildIssueDocumentInput` output merged
 * with `externalReference` / `documentKind` by the API). Used by the
 * "Corrigir e reenviar" flow to present the data registered on a rejected or
 * failed document. Built only on the composer's exported pure helpers — the
 * composer files are intentionally left untouched.
 */
export function createIssueDraftFromDocument(
  document: FiscalDocument,
): FiscalIssueDraft {
  const metadata = asRecord(document.metadata);
  const draft = createEmptyIssueDraft(document.documentKind);
  const externalReference = stringValue(metadata.externalReference) ?? "";

  draft.externalReference = externalReference;
  if (externalReference.startsWith("sale:")) {
    draft.origin = "sale";
    draft.saleId = externalReference.slice("sale:".length) || null;
  } else if (externalReference.startsWith("entry:")) {
    draft.origin = "entry";
    draft.entryId = externalReference.slice("entry:".length) || null;
  }

  if (document.documentKind === "nfse") {
    const grossAmount = numberValue(metadata.grossAmount);
    draft.nfse = {
      competence: stringValue(metadata.competence) ?? draft.nfse.competence,
      grossAmount: grossAmount ? grossAmount.toFixed(2).replace(".", ",") : "",
      recipientId:
        document.recipientId ?? stringValue(metadata.recipientId) ?? "",
      templateId: document.templateId ?? stringValue(metadata.templateId) ?? "",
    };
    return draft;
  }

  const recipient = asRecord(metadata.recipient);
  draft.recipient = {
    city: stringValue(recipient.city) ?? "",
    cityCode: stringValue(recipient.cityCode) ?? "",
    district: stringValue(recipient.district) ?? "",
    document: stringValue(recipient.document) ?? "",
    email: stringValue(recipient.email) ?? "",
    name: stringValue(recipient.name) ?? "",
    number: stringValue(recipient.number) ?? "",
    phone: stringValue(recipient.phone) ?? "",
    postalCode: stringValue(recipient.postalCode) ?? "",
    state: stringValue(recipient.state) ?? "",
    street: stringValue(recipient.street) ?? "",
  };

  const vehicleNfe = asRecord(metadata.vehicleNfe);
  draft.vehicle = readVehicle(asRecord(vehicleNfe.vehicle));
  draft.operationType =
    stringValue(metadata.operationType) ??
    stringValue(asRecord(vehicleNfe.operation).type) ??
    draft.operationType;
  draft.fiscal = readFiscalForm(asRecord(vehicleNfe.fiscal), draft);
  draft.payments = readPayments(metadata.payments);
  draft.items = readItems(metadata, vehicleNfe, draft.items);
  return draft;
}

function readVehicle(vehicle: Record<string, unknown>): VehicleNfeVehicle {
  const result: VehicleNfeVehicle = {};
  const strings = {
    brand: vehicle.brand,
    chassis: vehicle.chassis,
    color: vehicle.color,
    condition: vehicle.condition,
    fuelType: vehicle.fuelType,
    id: vehicle.id,
    model: vehicle.model,
    plate: vehicle.plate,
    renavam: vehicle.renavam,
    version: vehicle.version,
  } as const;
  for (const [key, value] of Object.entries(strings)) {
    const parsed = stringValue(value);
    if (parsed) Object.assign(result, { [key]: parsed });
  }
  const numerics = {
    manufactureYear: vehicle.manufactureYear,
    modelYear: vehicle.modelYear,
    odometer: vehicle.odometer,
    year: vehicle.year,
  } as const;
  for (const [key, value] of Object.entries(numerics)) {
    const parsed = numberOrString(value);
    if (parsed !== undefined) Object.assign(result, { [key]: parsed });
  }
  const salePrice = numberValue(vehicle.salePrice);
  if (salePrice !== undefined) result.salePrice = salePrice;
  return result;
}

function readFiscalForm(
  fiscal: Record<string, unknown>,
  draft: FiscalIssueDraft,
): FiscalIssueDraft["fiscal"] {
  return {
    cfop: stringValue(fiscal.cfop) ?? draft.fiscal.cfop,
    cofinsRate: readRate(fiscal.cofins),
    cst: stringValue(fiscal.cst) ?? "",
    csosn: stringValue(fiscal.csosn) ?? draft.fiscal.csosn,
    icmsRate: readRate(fiscal.icms),
    ipiRate: readRate(fiscal.ipi),
    ncm: stringValue(fiscal.ncm) ?? draft.fiscal.ncm,
    origin: stringValue(fiscal.origin) ?? draft.fiscal.origin,
    pisRate: readRate(fiscal.pis),
  };
}

function readRate(value: unknown) {
  const rate = numberValue(asRecord(value).rate);
  return rate ? String(rate) : "";
}

function readPayments(value: unknown): IssuePayment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    const amount = numberValue(record.amount);
    const method = stringValue(record.method);
    return amount && method ? [{ amount, method }] : [];
  });
}

function readItems(
  metadata: Record<string, unknown>,
  vehicleNfe: Record<string, unknown>,
  fallback: FiscalIssueItem[],
): FiscalIssueItem[] {
  const items: FiscalIssueItem[] = [];
  const vehicle = asRecord(vehicleNfe.vehicle);
  const price = numberValue(asRecord(vehicleNfe.sale).price);
  const vehicleDescription = [
    stringValue(vehicle.brand),
    stringValue(vehicle.model),
  ]
    .filter(Boolean)
    .join(" ");
  if (vehicleDescription || price) {
    items.push({
      ...createEmptyIssueItem(),
      description: vehicleDescription,
      quantity: 1,
      unitAmount: price ?? 0,
    });
  }
  const additional = Array.isArray(metadata.additionalItems)
    ? metadata.additionalItems
    : [];
  for (const entry of additional) {
    const record = asRecord(entry);
    items.push({
      cfop: stringValue(record.cfop) ?? createEmptyIssueItem().cfop,
      description: stringValue(record.description) ?? "",
      discountAmount: numberValue(record.discountAmount) ?? 0,
      ncm: stringValue(record.ncm) ?? createEmptyIssueItem().ncm,
      quantity: numberValue(record.quantity) ?? 1,
      unitAmount: numberValue(record.unitAmount) ?? 0,
    });
  }
  return items.length ? items : fallback;
}

function numberOrString(value: unknown) {
  return numberValue(value) ?? stringValue(value);
}
