import type {
  VehicleSaleBundle,
  VehicleSalePayment,
} from "../ports/vehicleSalesRepository.js";

export function sumPaymentAmounts(
  payments: readonly VehicleSalePayment[],
): number {
  return payments.reduce((total, payment) => total + payment.amountCents, 0);
}

export function paymentSnapshot(
  payment: VehicleSalePayment,
  saleTradeInVehicle: Record<string, unknown> | null,
) {
  const metadata = payment.metadata ?? {};
  return {
    amountCents: payment.amountCents,
    description:
      typeof metadata.description === "string" && metadata.description.trim()
        ? metadata.description.trim()
        : typeof metadata.methodReference === "string" &&
            metadata.methodReference.trim()
          ? metadata.methodReference.trim()
          : null,
    dueAt: payment.dueAt,
    extraCents: payment.extraCents,
    id: payment.id,
    installments: payment.installments,
    method: payment.method,
    paidAt: payment.paidAt,
    principalCents: payment.principalCents,
    providerPaymentId: payment.providerPaymentId,
    status: payment.status,
    tradeInVehicle:
      metadata.tradeInVehicle && typeof metadata.tradeInVehicle === "object"
        ? metadata.tradeInVehicle
        : payment.method === "trade_in"
          ? saleTradeInVehicle
          : null,
  };
}

export function saleTradeInSnapshot(
  sale: VehicleSaleBundle,
): Record<string, unknown> | null {
  const value = sale.sale.saleSourceSnapshot?.tradeIn;
  return value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).enabled === true
    ? (value as Record<string, unknown>)
    : null;
}
