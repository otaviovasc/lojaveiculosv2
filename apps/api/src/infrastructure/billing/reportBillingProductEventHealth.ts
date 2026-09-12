import type { BillingProductEventOutboxSnapshot } from "../../domains/billing/ports/billingProductEventDelivery.js";
import type { ServiceLogger } from "../../shared/serviceContext.js";

export function reportBillingProductEventHealth(input: {
  logger: ServiceLogger;
  maxPendingAgeSeconds: number;
  snapshot: BillingProductEventOutboxSnapshot;
}) {
  input.logger.info("metric.billing_product_event.outbox", input.snapshot);
  const attentionRequired =
    input.snapshot.failedCount > 0 ||
    input.snapshot.oldestPendingAgeSeconds > input.maxPendingAgeSeconds;
  if (attentionRequired) {
    input.logger.error(
      "alert.billing_product_event.delivery_attention_required",
      input.snapshot,
    );
  }
  return { attentionRequired };
}
