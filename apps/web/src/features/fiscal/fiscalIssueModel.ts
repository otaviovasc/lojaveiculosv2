import type { FinanceEntry } from "../finance/types";
import type { SaleRecord } from "../sales/types";
import {
  formatBrazilianDocument,
  formatBrazilianPhone,
  formatBrazilianZipCode,
} from "../../lib/masks";
import type { VehicleNfeVehicle } from "./types";

export type IssueDocumentKind = "nfe" | "nfse";
export type IssueOriginType = "entry" | "sale" | "standalone";
export type IssueStep = "items" | "origin" | "recipient";

export type FiscalIssueItem = {
  cfop: string;
  description: string;
  discountAmount: number;
  ncm: string;
  quantity: number;
  unitAmount: number;
};

export type IssuePayment = {
  amount: number;
  method: string;
};

export type IssueRecipientForm = {
  city: string;
  cityCode: string;
  district: string;
  document: string;
  email: string;
  name: string;
  number: string;
  phone: string;
  postalCode: string;
  state: string;
  street: string;
};

export type IssueFiscalTaxForm = {
  cfop: string;
  cofinsRate: string;
  cst: string;
  csosn: string;
  icmsRate: string;
  ipiRate: string;
  ncm: string;
  origin: string;
  pisRate: string;
};

export type IssueNfseForm = {
  competence: string;
  grossAmount: string;
  recipientId: string;
  templateId: string;
};

export type FiscalIssueDraft = {
  entryId: string | null;
  externalReference: string;
  fiscal: IssueFiscalTaxForm;
  items: FiscalIssueItem[];
  kind: IssueDocumentKind;
  nfse: IssueNfseForm;
  operationType: string;
  origin: IssueOriginType;
  payments: IssuePayment[];
  recipient: IssueRecipientForm;
  saleId: string | null;
  vehicle: VehicleNfeVehicle;
};

export const DEFAULT_NFE_CFOP = "5102";
export const DEFAULT_NFE_NCM = "87032100";
export const DEFAULT_NFE_ORIGIN = "0";
export const DEFAULT_NFE_OPERATION_TYPE = "used_vehicle_sale";

const nfePaymentMethodMap: Record<string, string> = {
  boleto: "other",
  cash: "money",
  credit_card: "creditCard",
  financing: "other",
  letter_of_credit: "creditCard",
  pix: "pix",
  trade_in: "other",
  transfer: "bankTransfer",
};

export function createEmptyIssueDraft(
  kind: IssueDocumentKind = "nfe",
): FiscalIssueDraft {
  return {
    entryId: null,
    externalReference: "",
    fiscal: createDefaultFiscalForm(),
    items: [createEmptyIssueItem()],
    kind,
    nfse: {
      competence: defaultCompetence(),
      grossAmount: "",
      recipientId: "",
      templateId: "",
    },
    operationType: DEFAULT_NFE_OPERATION_TYPE,
    origin: "standalone",
    payments: [],
    recipient: createEmptyRecipientForm(),
    saleId: null,
    vehicle: {},
  };
}

export function createEmptyIssueItem(): FiscalIssueItem {
  return {
    cfop: DEFAULT_NFE_CFOP,
    description: "",
    discountAmount: 0,
    ncm: DEFAULT_NFE_NCM,
    quantity: 1,
    unitAmount: 0,
  };
}

function createDefaultFiscalForm(): IssueFiscalTaxForm {
  return {
    cfop: DEFAULT_NFE_CFOP,
    cofinsRate: "",
    cst: "",
    csosn: "102",
    icmsRate: "",
    ipiRate: "",
    ncm: DEFAULT_NFE_NCM,
    origin: DEFAULT_NFE_ORIGIN,
    pisRate: "",
  };
}

function createEmptyRecipientForm(): IssueRecipientForm {
  return {
    city: "",
    cityCode: "",
    district: "",
    document: "",
    email: "",
    name: "",
    number: "",
    phone: "",
    postalCode: "",
    state: "",
    street: "",
  };
}

export function applySaleToIssueDraft(
  draft: FiscalIssueDraft,
  sale: SaleRecord,
): FiscalIssueDraft {
  const buyer = asRecord(sale.buyerSnapshot);
  const listing = asRecord(sale.listingSnapshot);
  const priceCents =
    sale.salePriceCents ?? numberValue(listing.priceCents) ?? 0;
  const price = priceCents / 100;
  const title = stringValue(listing.title) ?? "Veículo da venda";
  const [brand, ...modelParts] = title.split(" ").filter(Boolean);

  return {
    ...draft,
    entryId: null,
    externalReference: `sale:${sale.id}`,
    items: [
      {
        ...createEmptyIssueItem(),
        description: buildSaleItemDescription(listing, title),
        quantity: 1,
        unitAmount: price,
      },
    ],
    payments: mapSalePayments(sale),
    recipient: {
      ...createEmptyRecipientForm(),
      city: stringValue(buyer.city) ?? "",
      document: formatBrazilianDocument(
        stringValue(buyer.document) ?? stringValue(buyer.cpf) ?? "",
      ),
      email: stringValue(buyer.email) ?? "",
      name: stringValue(buyer.name) ?? "",
      phone: formatBrazilianPhone(
        stringValue(buyer.phone) ?? stringValue(buyer.phone1) ?? "",
      ),
      postalCode: formatBrazilianZipCode(
        stringValue(buyer.postalCode) ?? stringValue(buyer.cep) ?? "",
      ),
      state: stringValue(buyer.state) ?? "",
      street: stringValue(buyer.address) ?? "",
    },
    saleId: sale.id,
    vehicle: {
      ...draft.vehicle,
      brand: stringValue(listing.brand) ?? brand ?? "",
      chassis: stringValue(listing.chassi) ?? "",
      color: stringValue(listing.colorName) ?? "",
      condition: stringValue(listing.condition) ?? "used",
      fuelType: stringValue(listing.fuelType) ?? "",
      id: sale.listingId ?? sale.unitId ?? "",
      manufactureYear: numberValue(listing.manufactureYear) ?? "",
      model: stringValue(listing.model) ?? modelParts.join(" "),
      modelYear: numberValue(listing.modelYear) ?? "",
      odometer: numberValue(listing.mileageKm) ?? "",
      plate: stringValue(listing.plate) ?? "",
      renavam: stringValue(listing.renavam) ?? "",
      salePrice: price,
    },
  };
}

export function applyEntryToIssueDraft(
  draft: FiscalIssueDraft,
  entry: FinanceEntry,
): FiscalIssueDraft {
  const amount = entry.amountCents / 100;
  const description = entry.name || formatEntryCategory(entry.category);
  return {
    ...draft,
    externalReference: `entry:${entry.id}`,
    items: [
      {
        ...createEmptyIssueItem(),
        description,
        quantity: 1,
        unitAmount: amount,
      },
    ],
    nfse: {
      ...draft.nfse,
      grossAmount: amount > 0 ? amount.toFixed(2) : draft.nfse.grossAmount,
    },
    saleId: null,
    entryId: entry.id,
  };
}

export function computeItemTotalCents(item: FiscalIssueItem): number {
  const gross = Math.round(item.quantity * item.unitAmount * 100);
  const discount = Math.round(item.discountAmount * 100);
  return Math.max(0, gross - discount);
}

export function computeIssueTotalCents(items: readonly FiscalIssueItem[]) {
  return items.reduce((sum, item) => sum + computeItemTotalCents(item), 0);
}

export function describeSaleForSearch(sale: SaleRecord) {
  const listing = asRecord(sale.listingSnapshot);
  const buyer = asRecord(sale.buyerSnapshot);
  return {
    detail: [
      stringValue(buyer.name),
      sale.salePriceCents ? formatBrl(sale.salePriceCents / 100) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    id: sale.id,
    label: stringValue(listing.title) ?? `Venda ${sale.id.slice(0, 8)}`,
  };
}

export function describeEntryForSearch(entry: FinanceEntry) {
  return {
    detail: [
      formatEntryCategory(entry.category),
      formatBrl(entry.amountCents / 100),
    ]
      .filter(Boolean)
      .join(" · "),
    id: entry.id,
    label: entry.name || formatEntryCategory(entry.category),
  };
}

export function matchesSaleQuery(sale: SaleRecord, query: string) {
  const haystack = [
    sale.id,
    ...Object.values(asRecord(sale.listingSnapshot)).map(String),
    ...Object.values(asRecord(sale.buyerSnapshot)).map(String),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

export function matchesEntryQuery(entry: FinanceEntry, query: string) {
  const haystack = [entry.id, entry.name, entry.category]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

export function amountFromInput(value: string) {
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}

function buildSaleItemDescription(
  listing: Record<string, unknown>,
  title: string,
) {
  return [
    title,
    listing.manufactureYear || listing.modelYear
      ? `Ano: ${listing.manufactureYear ?? "N/A"}/${listing.modelYear ?? "N/A"}`
      : null,
    listing.colorName ? `Cor: ${String(listing.colorName)}` : null,
    listing.plate ? `Placa: ${String(listing.plate)}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

function mapSalePayments(sale: SaleRecord): IssuePayment[] {
  return sale.payments
    .filter((payment) => payment.amountCents > 0)
    .map((payment) => ({
      amount: payment.amountCents / 100,
      method: nfePaymentMethodMap[payment.method] ?? "other",
    }));
}

function formatEntryCategory(category: string) {
  return category.replace(/_/g, " ").toLowerCase();
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown) {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function defaultCompetence() {
  return new Date().toISOString().slice(0, 7);
}
