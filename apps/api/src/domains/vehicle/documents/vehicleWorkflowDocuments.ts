import { isActiveSalePaymentStatus } from "@lojaveiculosv2/shared";
import type {
  CreateVehicleDocumentRecord,
  VoidVehicleDocumentsBySaleInput,
  VehicleDocumentKind,
  VehicleListing,
  VehicleUnit,
} from "../ports/vehicleInventoryRepository.js";
import type {
  VehicleBuyerSnapshot,
  VehicleSaleBundle,
  VehicleSalePayment,
} from "../ports/vehicleSalesRepository.js";
import type { DocumentTemplate } from "../../documents/ports/documentRepository.js";
import type { VehicleStoreBranding } from "../ports/vehicleStoreBrandingReader.js";

export const vehicleSaleDocumentKinds = [
  "sale_contract",
  "sale_receipt",
  "delivery_term",
  "power_of_attorney",
] as const satisfies readonly VehicleDocumentKind[];

export type VehicleSaleDocumentKind = (typeof vehicleSaleDocumentKinds)[number];

type WorkflowDocumentSpec = {
  kind: VehicleSaleDocumentKind;
  role: string;
  title: string;
};

const soldDocuments: Record<VehicleSaleDocumentKind, WorkflowDocumentSpec> = {
  sale_contract: {
    kind: "sale_contract",
    role: "sale_contract",
    title: "Contrato de compra e venda",
  },
  sale_receipt: {
    kind: "sale_receipt",
    role: "sale_receipt",
    title: "Recibo de venda",
  },
  delivery_term: {
    kind: "delivery_term",
    role: "delivery_term",
    title: "Termo de entrega",
  },
  power_of_attorney: {
    kind: "power_of_attorney",
    role: "power_of_attorney",
    title: "Procuração",
  },
};

export function buildReservationReceiptDocument(input: {
  buyer: VehicleBuyerSnapshot;
  listing: VehicleListing;
  sale: VehicleSaleBundle;
  signalPayment: VehicleSalePayment;
  store?: VehicleStoreBranding;
  template?: DocumentTemplate | null;
  unit: VehicleUnit;
}): CreateVehicleDocumentRecord {
  return buildDocumentRecord({
    kind: "reservation_receipt",
    listing: input.listing,
    metadata: {
      buyer: input.buyer,
      documentType: "recibo_de_sinal",
      finance: {
        paymentMethod: input.signalPayment.method,
        signalAmountCents: input.signalPayment.amountCents,
        status: input.signalPayment.status,
        totalAmountCents: input.sale.sale.salePriceCents,
      },
      saleId: input.sale.sale.id,
      salePaymentId: input.signalPayment.id,
      store: input.store ?? null,
      template: "recibo_de_sinal_v1",
      templateClauses: input.template?.clauses ?? null,
      templateTitle: input.template?.title ?? null,
      vehicle: vehicleSnapshot(input.listing, input.unit),
    },
    role: "reservation_receipt",
    title: `${input.template?.title ?? "Recibo de sinal"} - ${input.buyer.name}`,
    unit: input.unit,
  });
}

export function buildSoldDocuments(input: {
  buyer: VehicleBuyerSnapshot;
  listing: VehicleListing;
  sale: VehicleSaleBundle;
  selectedDocumentKinds?: readonly VehicleSaleDocumentKind[];
  store?: VehicleStoreBranding;
  templates?: ReadonlyMap<string, DocumentTemplate>;
  unit: VehicleUnit;
}): readonly CreateVehicleDocumentRecord[] {
  const selectedDocumentKinds =
    input.selectedDocumentKinds ?? vehicleSaleDocumentKinds;
  const activePayments = input.sale.payments.filter((payment) =>
    isActiveSalePaymentStatus(payment.status),
  );
  const paymentMethods = [
    ...new Set(activePayments.map((payment) => payment.method)),
  ];
  return selectedDocumentKinds.map((kind) => {
    const spec = soldDocuments[kind];
    const template = input.templates?.get(spec.kind);
    return buildDocumentRecord({
      kind: spec.kind,
      listing: input.listing,
      metadata: {
        buyer: input.buyer,
        documentType: spec.role,
        finance: {
          allocatedAmountCents: sumPaymentAmounts(activePayments),
          paidAmountCents: sumPaymentAmounts(
            activePayments.filter((payment) => payment.status === "paid"),
          ),
          paymentMethod: paymentMethods.join(", "),
          payments: activePayments.map(paymentSnapshot),
          salePriceCents: input.sale.sale.salePriceCents,
        },
        saleId: input.sale.sale.id,
        salePaymentIds: activePayments.map((payment) => payment.id),
        store: input.store ?? null,
        template: `${spec.role}_v1`,
        templateClauses: template?.clauses ?? null,
        templateTitle: template?.title ?? null,
        vehicle: vehicleSnapshot(input.listing, input.unit),
      },
      role: spec.role,
      title: `${template?.title ?? spec.title} - ${input.buyer.name}`,
      unit: input.unit,
    });
  });
}

function sumPaymentAmounts(payments: readonly VehicleSalePayment[]): number {
  return payments.reduce((total, payment) => total + payment.amountCents, 0);
}

function paymentSnapshot(payment: VehicleSalePayment) {
  return {
    amountCents: payment.amountCents,
    dueAt: payment.dueAt,
    extraCents: payment.extraCents,
    id: payment.id,
    installments: payment.installments,
    method: payment.method,
    paidAt: payment.paidAt,
    principalCents: payment.principalCents,
    providerPaymentId: payment.providerPaymentId,
    status: payment.status,
  };
}

export function appendVehicleDocumentVoidHistory(
  metadata: Record<string, unknown>,
  input: Pick<VoidVehicleDocumentsBySaleInput, "actorId" | "at" | "reason">,
): Record<string, unknown> {
  return {
    ...metadata,
    operationHistory: [
      ...vehicleDocumentOperationHistory(metadata),
      {
        action: "voided",
        actorId: input.actorId,
        at: input.at,
        reason: input.reason,
      },
    ],
  };
}

function vehicleDocumentOperationHistory(metadata: Record<string, unknown>) {
  const value = metadata.operationHistory;
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>).action === "string" &&
      typeof (item as Record<string, unknown>).actorId === "string",
  );
}

export function isVehicleSaleDocumentKind(
  value: string,
): value is VehicleSaleDocumentKind {
  return (vehicleSaleDocumentKinds as readonly string[]).includes(value);
}

export function parseVehicleSaleDocumentKinds(
  values: readonly string[],
): readonly VehicleSaleDocumentKind[] | null {
  const selected = values.filter(isVehicleSaleDocumentKind);
  return selected.length === values.length &&
    new Set(selected).size === selected.length
    ? selected
    : null;
}

function buildDocumentRecord(input: {
  kind: VehicleDocumentKind;
  listing: VehicleListing;
  metadata: Record<string, unknown>;
  role: string;
  title: string;
  unit: VehicleUnit;
}): CreateVehicleDocumentRecord {
  return {
    createdByUserId: null,
    fileName: `${input.role}-${input.unit.id}.pdf`,
    fileSizeBytes: null,
    kind: input.kind,
    linkRole: input.role,
    metadata: input.metadata,
    mimeType: "application/pdf",
    status: "issued",
    storageKey: `generated/vehicle-workflows/${input.unit.id}/${input.role}.pdf`,
    storeId: input.listing.storeId,
    targetId: input.unit.id,
    targetType: "vehicle_unit",
    tenantId: input.listing.tenantId,
    title: input.title,
  };
}

function vehicleSnapshot(listing: VehicleListing, unit: VehicleUnit) {
  return {
    catalog: listing.catalog,
    listingId: listing.id,
    manufactureYear: listing.manufactureYear,
    modelYear: listing.modelYear,
    plate: unit.plate ?? listing.plate,
    priceCents: listing.priceCents,
    title: listing.title,
    trimName: listing.trimName,
    unitId: unit.id,
    vin: unit.vin,
  };
}
