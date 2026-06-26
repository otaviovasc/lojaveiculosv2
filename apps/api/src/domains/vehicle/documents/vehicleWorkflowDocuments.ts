import type {
  CreateVehicleDocumentRecord,
  VehicleDocumentKind,
  VehicleListing,
  VehicleUnit,
} from "../ports/vehicleInventoryRepository.js";
import type {
  VehicleBuyerSnapshot,
  VehicleSaleBundle,
} from "../ports/vehicleSalesRepository.js";
import type { DocumentTemplate } from "../../documents/ports/documentRepository.js";

type WorkflowDocumentSpec = {
  kind: VehicleDocumentKind;
  role: string;
  title: string;
};

const soldDocuments: readonly WorkflowDocumentSpec[] = [
  {
    kind: "sale_contract",
    role: "sale_contract",
    title: "Contrato de compra e venda",
  },
  { kind: "sale_receipt", role: "sale_receipt", title: "Recibo de venda" },
  { kind: "delivery_term", role: "delivery_term", title: "Termo de entrega" },
  { kind: "power_of_attorney", role: "power_of_attorney", title: "Procuração" },
];

export function buildReservationReceiptDocument(input: {
  buyer: VehicleBuyerSnapshot;
  listing: VehicleListing;
  paymentMethod: string;
  sale: VehicleSaleBundle;
  signalAmountCents: number;
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
        paymentMethod: input.paymentMethod,
        signalAmountCents: input.signalAmountCents,
        totalAmountCents: input.sale.sale.salePriceCents,
      },
      saleId: input.sale.sale.id,
      salePaymentId: input.sale.payment?.id ?? null,
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
  paymentMethod: string;
  sale: VehicleSaleBundle;
  templates?: ReadonlyMap<string, DocumentTemplate>;
  unit: VehicleUnit;
}): readonly CreateVehicleDocumentRecord[] {
  return soldDocuments.map((spec) => {
    const template = input.templates?.get(spec.kind);
    return buildDocumentRecord({
      kind: spec.kind,
      listing: input.listing,
      metadata: {
        buyer: input.buyer,
        documentType: spec.role,
        finance: {
          paidAmountCents: input.sale.payment?.amountCents ?? null,
          paymentMethod: input.paymentMethod,
          salePriceCents: input.sale.sale.salePriceCents,
        },
        saleId: input.sale.sale.id,
        salePaymentId: input.sale.payment?.id ?? null,
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
