import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { BillingPlanQuoteRecord } from "../../ports/billingPlanHireRepository.js";
import {
  getBillingPlanHireRepository,
  requireBillingScope,
  type BillingServicePorts,
} from "./serviceSupport.js";

export async function requestBillingPlanQuote(
  context: ServiceContext,
  planId: string,
  ports: BillingServicePorts,
): Promise<BillingPlanQuoteRecord> {
  assertPermission(context, "billing.manage");
  const quote = await getBillingPlanHireRepository(ports).requestQuote({
    actorId: context.actor.id,
    planId,
    ...requireBillingScope(context),
  });
  await recordQuote(context, quote, "billing.plan_quote.requested");
  return quote;
}

export async function approveBillingPlanQuote(
  context: ServiceContext,
  input: {
    expiresAt: Date;
    quoteId: string;
    quotedCents: number;
  },
  ports: BillingServicePorts,
): Promise<BillingPlanQuoteRecord> {
  assertPermission(context, "billing.manage");
  const quote = await getBillingPlanHireRepository(ports).approveQuote({
    actorId: context.actor.id,
    ...input,
    ...requireBillingScope(context),
  });
  await recordQuote(context, quote, "billing.plan_quote.approved");
  return quote;
}

async function recordQuote(
  context: ServiceContext,
  quote: BillingPlanQuoteRecord,
  action: "billing.plan_quote.approved" | "billing.plan_quote.requested",
) {
  const metadata = {
    catalogVersion: quote.catalogVersion,
    planId: quote.planId,
    quoteId: quote.id,
    quotedCents: quote.quotedCents,
    status: quote.status,
  };
  context.logger.info(action, createServiceLogMetadata(context, metadata));
  await context.audit.record({
    action,
    actor: context.actor,
    category: "data_change",
    criticality: "critical",
    entityId: quote.id,
    entityType: "billing_plan_quote",
    metadata,
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: quote.storeId,
    summary:
      action === "billing.plan_quote.approved"
        ? "Approved server-owned Escala quote"
        : "Requested server-owned Escala quote",
    tenantId: quote.tenantId,
  });
}
