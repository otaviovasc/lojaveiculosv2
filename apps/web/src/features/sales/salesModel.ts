import { isActiveSalePaymentStatus } from "@lojaveiculosv2/shared";
import type {
  SaleDraftInput,
  SaleDocumentKind,
  SalePaymentInput,
  SaleRecord,
  SaleStartContext,
} from "./types";

export const defaultRequiredDocumentKinds = [
  "sale_contract",
  "sale_receipt",
  "delivery_term",
  "power_of_attorney",
] as const;

export const saleSourceOptions = [
  { label: "Lead Digital", value: "lead" },
  { label: "Loja Física (Walk-in)", value: "walk_in" },
  { label: "WhatsApp Comercial", value: "whatsapp" },
  { label: "Marketplace Externo", value: "marketplace" },
  { label: "Outro Canal", value: "custom" },
];

export type SaleReadinessPurpose = "close" | "reserve";

export function canPersistSaleWorkspaceEdits(sale: SaleRecord): boolean {
  return (
    sale.isCurrentRevision &&
    (sale.status === "draft" || sale.status === "pending")
  );
}

export function toDraftInput(sale: SaleRecord): SaleDraftInput {
  return {
    buyerSnapshot: sale.buyerSnapshot,
    documentPolicySnapshot: sale.documentPolicySnapshot,
    leadId: sale.leadId,
    listingId: sale.listingId,
    listingSnapshot: sale.listingSnapshot,
    payments: sale.payments.map(toPaymentInput),
    salePriceCents: sale.salePriceCents,
    saleSourceSnapshot: sale.saleSourceSnapshot,
    selectedDocumentKinds: sale.selectedDocumentKinds,
    sellerUserId: sale.sellerUserId,
    unitId: sale.unitId,
  };
}

export function createDraftFromContext(
  context: SaleStartContext,
): SaleDraftInput {
  return {
    buyerSnapshot: {
      email: context.buyerEmail ?? "",
      name: context.buyerName ?? "",
      phone: context.buyerPhone ?? "",
    },
    documentPolicySnapshot: {
      requiredDocumentKinds: [],
    },
    leadId: context.leadId ?? null,
    listingId: context.listingId ?? null,
    listingSnapshot: {
      title: context.listingTitle ?? "",
      unitLabel: context.unitLabel ?? "",
      plate: context.plate ?? null,
      colorName: context.colorName ?? null,
      primaryMediaUrl: context.primaryMediaUrl ?? null,
    },
    payments: [],
    salePriceCents: context.priceCents ?? null,
    saleSourceSnapshot: { source: "lead_or_vehicle_workspace" },
    selectedDocumentKinds: [...defaultRequiredDocumentKinds],
    unitId: context.unitId ?? null,
  };
}

export function parseSaleStartContext(): SaleStartContext {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
  const context: SaleStartContext = {};
  setParam(context, "buyerEmail", params.get("buyerEmail"));
  setParam(context, "buyerName", params.get("buyerName"));
  setParam(context, "buyerPhone", params.get("buyerPhone"));
  setParam(context, "leadId", params.get("leadId"));
  setParam(context, "listingId", params.get("listingId"));
  setParam(context, "listingTitle", params.get("listingTitle"));
  setParam(context, "unitId", params.get("unitId"));
  setParam(context, "unitLabel", params.get("unitLabel"));
  setParam(context, "plate", params.get("plate") || params.get("placa"));
  setParam(context, "colorName", params.get("colorName") || params.get("cor"));
  setParam(context, "primaryMediaUrl", params.get("primaryMediaUrl"));
  const priceCents = readNumber(params.get("priceCents"));
  if (priceCents !== undefined) context.priceCents = priceCents;
  return context;
}

export function saleMissingFields(
  sale: SaleRecord,
  purpose: SaleReadinessPurpose = "close",
): string[] {
  const missing: string[] = [];
  if (!hasBuyerName(sale.buyerSnapshot)) missing.push("Comprador");
  if (!sale.leadId) missing.push("Lead");
  if (!sale.unitId) missing.push("Veículo");
  if (!sale.sellerUserId) missing.push("Vendedor");
  if (!sale.salePriceCents) missing.push("Preço");

  if (purpose === "reserve") {
    const signalPayment = sale.payments.find(
      (payment) =>
        isActiveSalePaymentStatus(payment.status) &&
        payment.amountCents > 0 &&
        payment.principalCents > 0,
    );
    if (!signalPayment) {
      missing.push("Sinal de reserva");
    }
    return missing;
  }

  if (paymentPrincipalTotal(sale) < (sale.salePriceCents ?? 0)) {
    missing.push("Pagamentos");
  }
  for (const kind of requiredDocumentKinds(sale)) {
    if (!sale.selectedDocumentKinds.includes(kind)) missing.push(kind);
  }
  return missing;
}

export function hasBuyerName(snapshot: Record<string, unknown>): boolean {
  return typeof snapshot.name === "string" && snapshot.name.trim().length > 0;
}

export function requiredDocumentKinds(
  sale: SaleRecord,
): readonly SaleDocumentKind[] {
  const value = sale.documentPolicySnapshot.requiredDocumentKinds;
  if (!Array.isArray(value)) return defaultRequiredDocumentKinds;
  return value.filter(
    (item): item is SaleDocumentKind =>
      typeof item === "string" && isSaleDocumentKind(item),
  );
}

export function isSaleDocumentKind(value: string): value is SaleDocumentKind {
  return (defaultRequiredDocumentKinds as readonly string[]).includes(value);
}

export function paymentPrincipalTotal(sale: SaleRecord): number {
  return sale.payments.reduce(
    (total, payment) =>
      total +
      (isActiveSalePaymentStatus(payment.status) ? payment.principalCents : 0),
    0,
  );
}

export function reservationSignalPayment(
  sale: SaleRecord,
): SaleRecord["payments"][number] | undefined {
  return sale.payments.find(
    (payment) =>
      isActiveSalePaymentStatus(payment.status) &&
      payment.amountCents > 0 &&
      payment.principalCents > 0,
  );
}

export function formatCents(value: number | null | undefined): string {
  return ((value ?? 0) / 100).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}

export function parseCurrencyInput(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

function toPaymentInput(
  payment: SaleRecord["payments"][number],
): SalePaymentInput {
  return {
    amountCents: payment.amountCents,
    extraCents: payment.extraCents,
    ...(payment.id.startsWith("draft-payment-") ? {} : { id: payment.id }),
    installments: payment.installments,
    metadata: payment.metadata,
    method: payment.method,
    principalCents: payment.principalCents,
    status: payment.status,
  };
}

function readNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function setParam(
  context: SaleStartContext,
  key: keyof Omit<SaleStartContext, "priceCents">,
  value: string | null,
): void {
  if (value) context[key] = value;
}
