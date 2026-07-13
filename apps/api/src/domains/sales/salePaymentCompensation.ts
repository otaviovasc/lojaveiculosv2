import { isActiveSalePaymentStatus } from "@lojaveiculosv2/shared";
import type { SalePaymentLine } from "./ports/salesRepository.js";

export type SalePaymentCompensationReason = "paid" | "provider_managed";

export class SalePaymentCompensationRequiredError extends Error {
  constructor(readonly compensationReason: SalePaymentCompensationReason) {
    super(compensationMessage(compensationReason));
    this.name = "SalePaymentCompensationRequiredError";
  }
}

export function assertSalePaymentsLocallyReversible(
  payments: readonly Pick<
    SalePaymentLine,
    "paidAt" | "providerPaymentId" | "status"
  >[],
): void {
  const activePayments = payments.filter((payment) =>
    isActiveSalePaymentStatus(payment.status),
  );
  if (activePayments.some((payment) => payment.providerPaymentId !== null)) {
    throw new SalePaymentCompensationRequiredError("provider_managed");
  }
  if (
    activePayments.some(
      (payment) => payment.status === "paid" || payment.paidAt !== null,
    )
  ) {
    throw new SalePaymentCompensationRequiredError("paid");
  }
}

function compensationMessage(reason: SalePaymentCompensationReason): string {
  if (reason === "provider_managed") {
    return "Provider-managed sale payments must be cancelled or refunded before this operation.";
  }
  return "Paid sale payments require an explicit refund or correction before this operation.";
}
