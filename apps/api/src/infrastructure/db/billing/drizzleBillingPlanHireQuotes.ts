import { and, eq, gt, isNull, or } from "drizzle-orm";
import { billingPlanQuotes, plans, stores } from "@lojaveiculosv2/db";
import type { BillingPlanHireRepository } from "../../../domains/billing/ports/billingPlanHireRepository.js";
import { findActiveBillingCatalogVersion } from "./drizzleActiveBillingCatalog.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import {
  toPlanQuote,
  unavailablePlanHire,
} from "./drizzleBillingPlanHireSupport.js";

type ApproveQuoteInput = Parameters<
  BillingPlanHireRepository["approveQuote"]
>[0];
type RequestQuoteInput = Parameters<
  BillingPlanHireRepository["requestQuote"]
>[0];

export async function approveBillingPlanQuote(
  db: DrizzleBillingClient,
  input: ApproveQuoteInput,
) {
  const [quote] = await db
    .update(billingPlanQuotes)
    .set({
      approvedAt: new Date(),
      approvedByActorId: input.actorId,
      expiresAt: input.expiresAt,
      quotedCents: input.quotedCents,
      status: "approved",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(billingPlanQuotes.id, input.quoteId),
        eq(billingPlanQuotes.storeId, input.storeId),
        eq(billingPlanQuotes.tenantId, input.tenantId),
        eq(billingPlanQuotes.status, "requested"),
      ),
    )
    .returning();
  if (!quote) throw unavailablePlanHire("quote_unavailable");
  return toPlanQuote(quote);
}

export async function requestBillingPlanQuote(
  db: DrizzleBillingClient,
  input: RequestQuoteInput,
) {
  const catalogVersion = await findActiveBillingCatalogVersion(db);
  if (!catalogVersion) throw unavailablePlanHire("catalog_unavailable");
  const [plan] = await db
    .select({ id: plans.id })
    .from(plans)
    .innerJoin(
      stores,
      and(
        eq(stores.id, input.storeId),
        eq(stores.tenantId, input.tenantId),
        eq(stores.isDeleted, false),
      ),
    )
    .where(
      and(
        eq(plans.id, input.planId),
        eq(plans.catalogVersion, catalogVersion),
        eq(plans.code, "escala"),
        eq(plans.status, "active"),
      ),
    )
    .limit(1);
  if (!plan) throw unavailablePlanHire("quote_plan_unavailable");
  const [quote] = await db
    .insert(billingPlanQuotes)
    .values({
      catalogVersion,
      planId: plan.id,
      requestedByActorId: input.actorId,
      status: "requested",
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .returning();
  if (!quote) throw new Error("Billing plan quote was not persisted.");
  return toPlanQuote(quote);
}

export async function resolveBillingPlanQuote(
  db: DrizzleBillingClient,
  input: {
    checkoutMode: "free" | "checkout" | "quote_required";
    planId: string;
    quoteId?: string;
    storeId: string;
    tenantId: string;
  },
) {
  if (input.checkoutMode !== "quote_required") return null;
  if (!input.quoteId) throw unavailablePlanHire("quote_required");
  const now = new Date();
  const [quote] = await db
    .select()
    .from(billingPlanQuotes)
    .where(
      and(
        eq(billingPlanQuotes.id, input.quoteId),
        eq(billingPlanQuotes.planId, input.planId),
        eq(billingPlanQuotes.storeId, input.storeId),
        eq(billingPlanQuotes.tenantId, input.tenantId),
        eq(billingPlanQuotes.status, "approved"),
        or(
          isNull(billingPlanQuotes.expiresAt),
          gt(billingPlanQuotes.expiresAt, now),
        ),
      ),
    )
    .limit(1);
  if (!quote?.quotedCents) throw unavailablePlanHire("quote_unavailable");
  return quote;
}
