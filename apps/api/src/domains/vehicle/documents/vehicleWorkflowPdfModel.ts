import type {
  PdfPaymentRow,
  PdfStoreInfo,
  PdfVehicleInfo,
} from "../../documents/render/reactPdfDocumentPrimitives.js";
import {
  buyerDocumentLabel,
  formatCurrencyCents,
  formatPdfDate,
} from "../../documents/render/reactPdfDocumentPrimitives.js";
import type { CreateVehicleDocumentRecord } from "../ports/vehicleInventoryRepository.js";
import {
  createWorkflowTemplateVariables,
  interpolateWorkflowTemplateClause,
} from "./vehicleWorkflowTemplateVariables.js";
import {
  asRecord,
  formatReservationDeadline,
  fuelTypeLabels,
  optionalNumber,
  optionalText,
  parseDate,
  paymentSnapshots,
  stringArray,
  tradeInVehicle,
  tradeInVehicleFromMetadata,
  transferStatusLabel,
  witnesses,
} from "./vehicleWorkflowPdfModelSupport.js";

export { transferStatusLabel } from "./vehicleWorkflowPdfModelSupport.js";

export type WorkflowPdfBuyer = {
  address?: string | undefined;
  cep?: string | undefined;
  city?: string | undefined;
  district?: string | undefined;
  document?: string | undefined;
  documentLabel: string;
  email?: string | undefined;
  maritalStatus?: string | undefined;
  name: string;
  nationality?: string | undefined;
  phone?: string | undefined;
  phone2?: string | undefined;
  phone3?: string | undefined;
  profession?: string | undefined;
  state?: string | undefined;
};

export type WorkflowPdfFinance = {
  discountCents?: number | undefined;
  paidAmountCents?: number | undefined;
  paymentMethod?: string | undefined;
  payments: readonly PdfPaymentRow[];
  salePriceCents?: number | undefined;
  signalAmountCents?: number | undefined;
  tablePriceCents?: number | undefined;
  totalAmountCents?: number | undefined;
};

export type WorkflowPdfTransfer = {
  crvCpf?: string | undefined;
  crvName?: string | undefined;
  statusLabel?: string | undefined;
  valueCents?: number | undefined;
};

export type WorkflowPdfModel = {
  buyer: WorkflowPdfBuyer;
  clauses: readonly string[];
  finance: WorkflowPdfFinance;
  generatedAt: Date;
  kind: string;
  notes?: string | undefined;
  reservationExpiresAt?: string | undefined;
  sale: { code: string };
  sellerName?: string | undefined;
  store: PdfStoreInfo;
  title: string;
  tradeInVehicle?: PdfVehicleInfo | undefined;
  transfer?: WorkflowPdfTransfer | undefined;
  vehicle: PdfVehicleInfo;
  witnesses: readonly string[];
};

export function buildWorkflowPdfModel(
  record: CreateVehicleDocumentRecord,
): WorkflowPdfModel {
  const metadata = asRecord(record.metadata);
  const buyer = asRecord(metadata.buyer);
  const finance = asRecord(metadata.finance);
  const store = asRecord(metadata.store);
  const vehicle = asRecord(metadata.vehicle);
  const catalog = asRecord(vehicle.catalog);
  const transfer = asRecord(metadata.transfer);
  const payments = paymentSnapshots(finance.payments);
  const variables = createWorkflowTemplateVariables({
    buyer,
    finance,
    store,
    vehicle,
  });
  const buyerDocument = optionalText(buyer.document);

  return {
    buyer: {
      address: optionalText(buyer.address),
      cep: optionalText(buyer.cep ?? buyer.zipCode),
      city: optionalText(buyer.city),
      district: optionalText(buyer.district ?? buyer.bairro),
      document: buyerDocument,
      documentLabel:
        optionalText(buyer.documentType) ?? buyerDocumentLabel(buyerDocument),
      email: optionalText(buyer.email),
      maritalStatus: optionalText(buyer.maritalStatus ?? buyer.estadoCivil),
      name: optionalText(buyer.name) ?? "Comprador",
      nationality: optionalText(buyer.nationality ?? buyer.nacionalidade),
      phone: optionalText(buyer.phone),
      phone2: optionalText(buyer.phone2),
      phone3: optionalText(buyer.phone3),
      profession: optionalText(buyer.profession ?? buyer.profissao),
      state: optionalText(buyer.state),
    },
    clauses: stringArray(metadata.templateClauses).map((clause) =>
      interpolateWorkflowTemplateClause(clause, variables),
    ),
    finance: {
      discountCents: optionalNumber(finance.discountCents),
      paidAmountCents: optionalNumber(finance.paidAmountCents),
      paymentMethod: optionalText(finance.paymentMethod),
      payments: payments.map((payment) => payment.row),
      salePriceCents: optionalNumber(finance.salePriceCents),
      signalAmountCents: optionalNumber(finance.signalAmountCents),
      tablePriceCents: optionalNumber(finance.tablePriceCents),
      totalAmountCents: optionalNumber(finance.totalAmountCents),
    },
    generatedAt: parseDate(metadata.generatedAt) ?? new Date(),
    kind: record.kind,
    notes: optionalText(metadata.notes),
    reservationExpiresAt: formatReservationDeadline(
      metadata.reservationExpiresAt,
    ),
    sale: {
      code:
        optionalText(metadata.saleCode) ?? optionalText(metadata.saleId) ?? "-",
    },
    sellerName: optionalText(metadata.sellerName),
    store: {
      address: optionalText(store.address),
      city: optionalText(store.city),
      document: optionalText(store.document),
      instagram: optionalText(store.instagram),
      logoUrl: optionalText(store.logoUrl),
      name: optionalText(store.name) ?? "Loja Veículos",
      phone: optionalText(store.phone),
      state: optionalText(store.state),
    },
    title: optionalText(metadata.templateTitle) ?? record.title,
    tradeInVehicle:
      tradeInVehicle(payments) ??
      tradeInVehicleFromMetadata(metadata.tradeInVehicle),
    transfer: optionalText(transfer.status)
      ? {
          crvCpf: optionalText(transfer.crvCpf),
          crvName: optionalText(transfer.crvName),
          statusLabel: transferStatusLabel(transfer.status),
          valueCents: optionalNumber(transfer.valueCents),
        }
      : undefined,
    vehicle: {
      brand: optionalText(catalog.brandName ?? vehicle.brand),
      chassi: optionalText(vehicle.vin ?? vehicle.chassi),
      color: optionalText(vehicle.color),
      fuel:
        optionalText(catalog.fuel) ??
        fuelTypeLabels[optionalText(vehicle.fuelType) ?? ""] ??
        optionalText(vehicle.fuelType),
      laudo: optionalText(vehicle.laudo),
      manufactureYear: optionalNumber(vehicle.manufactureYear),
      model: optionalText(catalog.modelName ?? vehicle.model),
      modelYear: optionalNumber(vehicle.modelYear),
      plate: optionalText(vehicle.plate),
      renavam: optionalText(vehicle.renavam),
      title: optionalText(vehicle.title),
      version: optionalText(vehicle.trimName ?? vehicle.version),
      km: optionalNumber(vehicle.km),
    },
    witnesses: witnesses(metadata),
  };
}
