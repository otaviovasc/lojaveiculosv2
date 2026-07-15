import {
  isActiveSalePaymentStatus,
  salePaymentMethodUsesInstallments,
} from "@lojaveiculosv2/shared";
import type { SaleRecord } from "./ports/salesRepository.js";

export function hasSaleBuyerName(snapshot: Record<string, unknown>): boolean {
  return typeof snapshot.name === "string" && snapshot.name.trim().length > 0;
}

export function collectMissingSalePaymentFields(
  payments: SaleRecord["payments"],
): string[] {
  const missing: string[] = [];
  for (const payment of payments) {
    if (!isActiveSalePaymentStatus(payment.status)) continue;
    if (!payment.dueAt) missing.push(`payment_due_at:${payment.id}`);
    if (
      salePaymentMethodUsesInstallments(payment.method) &&
      (!payment.installments || payment.installments < 1)
    ) {
      missing.push(`payment_installments:${payment.id}`);
    }
  }
  return missing;
}
