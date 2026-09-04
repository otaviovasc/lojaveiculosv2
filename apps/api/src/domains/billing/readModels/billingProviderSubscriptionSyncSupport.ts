import type { BillingChargePreviewLineItem } from "../ports/billingRepository.js";
import type { PaymentProviderGateway } from "../ports/paymentProviderGateway.js";
import { BillingProviderSyncError } from "./billingProviderSyncModel.js";
import type { BillingServicePorts } from "../services/BillingService/serviceSupport.js";

export function recurringTotalCents(
  lineItems: readonly BillingChargePreviewLineItem[],
  renewalDate: Date,
) {
  const renewal = renewalDate.getTime();
  return lineItems
    .filter(
      (item) =>
        (!item.startsAt || item.startsAt.getTime() <= renewal) &&
        (!item.endsAt || item.endsAt.getTime() > renewal),
    )
    .reduce((total, item) => total + item.fullAmountCents, 0);
}

export function getPaymentProviderGateway(
  ports: BillingServicePorts,
): PaymentProviderGateway &
  Required<Pick<PaymentProviderGateway, "syncCustomer" | "syncSubscription">> {
  if (!ports.paymentProviderGateway?.syncCustomer) {
    throw new BillingProviderSyncError(
      "missing_provider_customer_sync",
      "Billing payment provider customer sync is not configured.",
      503,
    );
  }
  if (!ports.paymentProviderGateway.syncSubscription) {
    throw new BillingProviderSyncError(
      "missing_provider_subscription_sync",
      "Billing payment provider subscription sync is not configured.",
      503,
    );
  }
  return ports.paymentProviderGateway as PaymentProviderGateway &
    Required<Pick<PaymentProviderGateway, "syncCustomer" | "syncSubscription">>;
}
