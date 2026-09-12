import { isActiveSalePaymentStatus } from "@lojaveiculosv2/shared";
import type { SaleRecord } from "./ports/salesRepository.js";

const tradeInFieldCodes = {
  brand: "trade_in_brand",
  chassi: "trade_in_chassi",
  color: "trade_in_color",
  manufactureYear: "trade_in_manufacture_year",
  model: "trade_in_model",
  modelYear: "trade_in_model_year",
  plate: "trade_in_plate",
  renavam: "trade_in_renavam",
  valuation: "trade_in_valuation",
} as const;

export function collectMissingSaleTradeInFields(sale: SaleRecord): string[] {
  const activeTradeInPayments = sale.payments.filter(
    (payment) =>
      payment.method === "trade_in" &&
      isActiveSalePaymentStatus(payment.status),
  );
  const tradeIn = readRecord(sale.saleSourceSnapshot.tradeIn);
  const enabled = tradeIn?.enabled === true;

  if (activeTradeInPayments.length > 0 && !enabled) {
    return ["trade_in_snapshot"];
  }
  if (!enabled || !tradeIn) return [];

  const missing: string[] = [];
  if (activeTradeInPayments.length === 0) missing.push("trade_in_payment");
  if (activeTradeInPayments.length > 1) {
    missing.push("trade_in_payment_count");
  }

  const catalog = readRecord(tradeIn.catalog);
  if (!readText(tradeIn.brand) && !readText(catalog?.brandName)) {
    missing.push(tradeInFieldCodes.brand);
  }
  if (!readText(tradeIn.model) && !readText(catalog?.modelName)) {
    missing.push(tradeInFieldCodes.model);
  }
  if (normalizedAlphaNumericLength(tradeIn.plate) < 7) {
    missing.push(tradeInFieldCodes.plate);
  }
  if (!readPositiveInteger(tradeIn.yearFabrication)) {
    missing.push(tradeInFieldCodes.manufactureYear);
  }
  if (
    !readPositiveInteger(tradeIn.yearModel) &&
    !readPositiveInteger(catalog?.modelYear)
  ) {
    missing.push(tradeInFieldCodes.modelYear);
  }
  if (!readText(tradeIn.color)) missing.push(tradeInFieldCodes.color);
  if (normalizedAlphaNumericLength(tradeIn.chassi ?? tradeIn.chassis) !== 17) {
    missing.push(tradeInFieldCodes.chassi);
  }
  if (normalizedDigitLength(tradeIn.renavam) !== 11) {
    missing.push(tradeInFieldCodes.renavam);
  }

  const valuationCents = readPositiveInteger(tradeIn.valuationCents);
  if (!valuationCents) {
    missing.push(tradeInFieldCodes.valuation);
  } else if (
    activeTradeInPayments.length > 0 &&
    activeTradeInPayments.reduce(
      (total, payment) => total + payment.principalCents,
      0,
    ) !== valuationCents
  ) {
    missing.push("trade_in_payment_valuation");
  }

  return missing;
}

function normalizedAlphaNumericLength(value: unknown): number {
  return readText(value)?.replace(/[^A-Z0-9]/gi, "").length ?? 0;
}

function normalizedDigitLength(value: unknown): number {
  return readText(value)?.replace(/\D/g, "").length ?? 0;
}

function readPositiveInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) > 0
    ? Number(value)
    : null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
