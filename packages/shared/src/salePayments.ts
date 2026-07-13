export const salePaymentMethods = [
  "pix",
  "transfer",
  "cash",
  "financing",
  "credit_card",
  "boleto",
  "letter_of_credit",
  "trade_in",
] as const;

export type SalePaymentMethod = (typeof salePaymentMethods)[number];

export const salePaymentStatuses = [
  "pending",
  "paid",
  "refunded",
  "cancelled",
] as const;

export type SalePaymentStatus = (typeof salePaymentStatuses)[number];

export function isSalePaymentMethod(
  value: unknown,
): value is SalePaymentMethod {
  return (
    typeof value === "string" &&
    salePaymentMethods.some((method) => method === value)
  );
}

export function isActiveSalePaymentStatus(
  status: SalePaymentStatus,
): status is Extract<SalePaymentStatus, "paid" | "pending"> {
  return status === "paid" || status === "pending";
}
