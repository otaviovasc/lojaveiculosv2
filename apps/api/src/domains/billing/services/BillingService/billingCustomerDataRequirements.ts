import type { PaymentProviderCheckoutInput } from "../../ports/paymentProviderGateway.js";

export type BillingCustomerData = NonNullable<
  PaymentProviderCheckoutInput["customerData"]
>;

export type BillingCustomerRequiredField =
  "email" | "cpfCnpj" | "address" | "addressNumber" | "province" | "postalCode";

const REQUIRED_FIELDS: readonly BillingCustomerRequiredField[] = [
  "email",
  "cpfCnpj",
  "address",
  "addressNumber",
  "province",
  "postalCode",
];

export function missingBillingCustomerFields(
  customerData: BillingCustomerData | null | undefined,
): BillingCustomerRequiredField[] {
  if (!customerData) return [...REQUIRED_FIELDS];
  return REQUIRED_FIELDS.filter((field) => {
    const value = customerData[field];
    return typeof value !== "string" || value.trim().length === 0;
  });
}
