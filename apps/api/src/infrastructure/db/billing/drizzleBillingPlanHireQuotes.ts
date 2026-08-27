import { and, desc, eq, gt, isNotNull, isNull, or, sql } from "drizzle-orm";
import { billingPlanQuotes, plans, stores } from "@lojaveiculosv2/db";
import type { BillingPlanHireRepository } from "../../../domains/billing/ports/billingPlanHireRepository.js";
import { findActiveBillingCatalogVersion } from "./drizzleActiveBillingCatalog.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { enqueueBillingAudit } from "./drizzleBillingAuditOutboxMutation.js";
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
  if (!Number.isSafeInteger(input.quotedCents) || input.quotedCents <= 0) {
    throw unavailablePlanHire("quote_price_invalid");
  }
  return db.transaction(async (transaction) => {
    const tx = transaction as DrizzleBillingClient;
    const now = new Date();
    const [quote] = await tx
      .update(billingPlanQuotes)
      .set({
        approvedAt: now,
        approvedByActorId: input.actorId,
        expiresAt: input.expiresAt,
        quotedCents: input.quotedCents,
        status: "approved",
        updatedAt: now,
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
    await enqueueQuoteAudit(tx, input.audit, quote, "approved", now);
    return toPlanQuote(quote);
  });
}

export async function requestBillingPlanQuote(
  db: DrizzleBillingClient,
  input: RequestQuoteInput,
) {
  return db.transaction(async (transaction) => {
    const tx = transaction as DrizzleBillingClient;
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${input.tenantId}:${input.storeId}:${input.planId}:plan-quote`}, 31))`,
    );
    const catalogVersion = await findActiveBillingCatalogVersion(tx);
    if (!catalogVersion) throw unavailablePlanHire("catalog_unavailable");
    const [plan] = await tx
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

    const now = new Date();
    const scope = and(
      eq(billingPlanQuotes.catalogVersion, catalogVersion),
      eq(billingPlanQuotes.planId, plan.id),
      eq(billingPlanQuotes.storeId, input.storeId),
      eq(billingPlanQuotes.tenantId, input.tenantId),
    );
    const [requested] = await tx
      .select()
      .from(billingPlanQuotes)
      .where(
        and(
          scope,
          eq(billingPlanQuotes.status, "requested"),
          or(
            isNull(billingPlanQuotes.expiresAt),
            gt(billingPlanQuotes.expiresAt, now),
          ),
        ),
      )
      .orderBy(desc(billingPlanQuotes.createdAt))
      .limit(1);
    if (requested) return toPlanQuote(requested);

    const [approved] = await tx
      .select()
      .from(billingPlanQuotes)
      .where(
        and(
          scope,
          eq(billingPlanQuotes.status, "approved"),
          isNotNull(billingPlanQuotes.approvedAt),
          isNotNull(billingPlanQuotes.approvedByActorId),
          isNotNull(billingPlanQuotes.quotedCents),
          gt(billingPlanQuotes.quotedCents, 0),
          or(
            isNull(billingPlanQuotes.expiresAt),
            gt(billingPlanQuotes.expiresAt, now),
          ),
        ),
      )
      .orderBy(desc(billingPlanQuotes.createdAt))
      .limit(1);
    if (approved) return toPlanQuote(approved);

    const [quote] = await tx
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
    await enqueueQuoteAudit(
      tx,
      input.audit,
      quote,
      "requested",
      quote.createdAt,
    );
    return toPlanQuote(quote);
  });
}

async function enqueueQuoteAudit(
  db: DrizzleBillingClient,
  audit: RequestQuoteInput["audit"],
  quote: typeof billingPlanQuotes.$inferSelect,
  action: "approved" | "requested",
  occurredAt: Date,
) {
  await enqueueBillingAudit(db, {
    action: `billing.plan_quote.${action}`,
    audit,
    entityId: quote.id,
    entityType: "billing_plan_quote",
    idempotencyKey: `billing-audit:quote:${quote.id}:${action}`,
    metadata: {
      catalogVersion: quote.catalogVersion,
      planId: quote.planId,
      quoteId: quote.id,
      ...(quote.quotedCents === null ? {} : { quotedCents: quote.quotedCents }),
      status: quote.status,
    },
    occurredAt,
    storeId: quote.storeId,
    tenantId: quote.tenantId,
  });
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
