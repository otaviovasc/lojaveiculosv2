import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { BillingProductEventOutboxRepository } from "../../ports/billingProductEventDelivery.js";

export async function requeueBillingProductEvent(
  context: ServiceContext,
  input: { eventId: string; now?: Date },
  repository: BillingProductEventOutboxRepository,
) {
  assertPermission(context, "billing.manage");
  if (!context.tenantId) {
    throw new BillingProductEventRequeueError(
      "BILLING_PRODUCT_EVENT_SCOPE_REQUIRED",
      "Tenant scope is required to requeue a billing product event.",
    );
  }
  context.logger.info(
    "billing.product_event.requeue.started",
    createServiceLogMetadata(context, { eventId: input.eventId }),
  );
  await context.audit.record({
    action: "billing.product_event.requeue.requested",
    actor: context.actor,
    category: "integration",
    criticality: "high",
    entityId: input.eventId,
    entityType: "billing_product_event",
    metadata: { eventId: input.eventId },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Requested tenant-scoped billing product event requeue",
    tenantId: context.tenantId,
  });
  const result = await repository.requeueFailed({
    eventId: input.eventId,
    now: input.now ?? new Date(),
    tenantId: context.tenantId,
  });
  const outcome =
    result.kind === "not_found" || result.kind === "not_requeueable"
      ? "failed"
      : "succeeded";
  const metadata = {
    eventId: input.eventId,
    result: result.kind,
    ...(result.kind === "requeued"
      ? {
          eventName: result.eventName,
          requeueCount: result.requeueCount,
        }
      : {}),
  };
  context.logger[outcome === "succeeded" ? "info" : "warn"](
    "billing.product_event.requeue",
    createServiceLogMetadata(context, metadata),
  );
  await context.audit.record({
    action: "billing.product_event.requeue",
    actor: context.actor,
    category: "integration",
    criticality: "high",
    entityId: input.eventId,
    entityType: "billing_product_event",
    metadata,
    outcome,
    requestId: context.requestId,
    storeId: result.kind === "requeued" ? result.storeId : context.storeId,
    summary:
      result.kind === "requeued"
        ? "Requeued failed billing product event"
        : result.kind === "already_pending"
          ? "Billing product event was already pending; no new cycle created"
          : "Billing product event requeue rejected",
    tenantId: context.tenantId,
  });
  if (result.kind === "not_found") {
    throw new BillingProductEventRequeueError(
      "BILLING_PRODUCT_EVENT_NOT_FOUND",
      "Failed billing product event was not found in the tenant scope.",
    );
  }
  if (result.kind === "not_requeueable") {
    throw new BillingProductEventRequeueError(
      "BILLING_PRODUCT_EVENT_NOT_REQUEUEABLE",
      "Only terminal failed billing product events can be requeued.",
    );
  }
  return result;
}

export class BillingProductEventRequeueError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "BillingProductEventRequeueError";
  }
}
