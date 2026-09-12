import {
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
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
import { createDurableBillingAuditIntent } from "./billingPlanHireAudit.js";

export async function requestBillingPlanQuote(
  context: ServiceContext,
  planId: string,
  ports: BillingServicePorts,
): Promise<BillingPlanQuoteRecord> {
  assertPermission(context, "billing.manage");
  const quote = await getBillingPlanHireRepository(ports).requestQuote({
    actorId: context.actor.id,
    audit: createDurableBillingAuditIntent(context),
    planId,
    ...requireBillingScope(context),
  });
  logQuote(context, quote, "billing.plan_quote.requested");
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
  assertPlatformQuoteApprovalAuthority(context);
  const quote = await getBillingPlanHireRepository(ports).approveQuote({
    actorId: context.actor.id,
    audit: createDurableBillingAuditIntent(context),
    ...input,
    ...requireBillingScope(context),
  });
  logQuote(context, quote, "billing.plan_quote.approved");
  return quote;
}

function assertPlatformQuoteApprovalAuthority(context: ServiceContext): void {
  if (context.actor.kind === "user" && context.platformAdmin) return;
  context.logger.warn(
    "billing.plan_quote.approval.denied",
    createServiceLogMetadata(context, {
      reason: "platform_admin_required",
    }),
  );
  throw new BillingPlanQuoteApprovalError();
}

export class BillingPlanQuoteApprovalError extends AuthorizationError {
  constructor() {
    super("Escala quote approval requires platform administrator authority.");
    this.name = "BillingPlanQuoteApprovalError";
  }
}

function logQuote(
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
}
