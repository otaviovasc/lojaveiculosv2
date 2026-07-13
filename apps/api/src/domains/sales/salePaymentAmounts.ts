import type { SaveSalePaymentInput } from "./ports/salesRepository.js";

export class SalePaymentAmountError extends Error {
  constructor(readonly paymentIndex: number) {
    super(
      `Sale payment ${paymentIndex + 1} amount must equal principal plus extras.`,
    );
    this.name = "SalePaymentAmountError";
  }
}

export function assertSalePaymentAmounts(
  payments: readonly SaveSalePaymentInput[] | undefined,
): void {
  payments?.forEach((payment, index) => {
    const extraCents = payment.extraCents ?? 0;
    const principalCents = payment.principalCents ?? payment.amountCents;
    if (
      payment.amountCents < 0 ||
      principalCents < 0 ||
      extraCents < 0 ||
      payment.amountCents !== principalCents + extraCents
    ) {
      throw new SalePaymentAmountError(index);
    }
  });
}
