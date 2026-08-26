import { and, desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import {
  billingCheckoutSessions,
  billingPlanHires,
  billingPlanQuotes,
  plans,
  storeProfiles,
  stores,
} from "@lojaveiculosv2/db";
import type {
  BillingPlanHireRepository,
  BillingPlanHireStatus,
} from "../../../domains/billing/ports/billingPlanHireRepository.js";
import { ensureTenantBillingAccount } from "./drizzleBillingAccount.js";
import { findActiveBillingCatalogVersion } from "./drizzleActiveBillingCatalog.js";
import {
  findEffectivePlanItems,
  scheduleFreePlanContract,
} from "./drizzleBillingPlanHireContracts.js";
import { resolveBillingPlanQuote } from "./drizzleBillingPlanHireQuotes.js";
import {
  planCheckoutMode,
  planSelectionRank,
  recordPlanHireTransition,
  toPlanHire,
  unavailablePlanHire,
} from "./drizzleBillingPlanHireSupport.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";

type PrepareHireInput = Parameters<BillingPlanHireRepository["prepareHire"]>[0];

export async function prepareBillingPlanHire(
  db: DrizzleBillingClient,
  input: PrepareHireInput,
) {
  return db.transaction(async (tx) => {
    const txDb = tx as DrizzleBillingClient;
    await lockPlanHire(txDb, input);
    const existing = await findExistingHire(txDb, input);
    if (existing) return existing;
    await assertNoOpenHire(txDb, input);

    const catalogVersion = await findActiveBillingCatalogVersion(txDb);
    if (!catalogVersion) throw unavailablePlanHire("catalog_unavailable");
    const now = new Date();
    const [plan] = await txDb
      .select()
      .from(plans)
      .where(
        and(
          eq(plans.id, input.planId),
          eq(plans.catalogVersion, catalogVersion),
          eq(plans.status, "active"),
          lte(plans.publishedAt, now),
        ),
      )
      .limit(1);
    if (!plan) throw unavailablePlanHire("plan_unavailable");
    const [store] = await txDb
      .select({ name: stores.tradingName, phone: storeProfiles.contactPhone })
      .from(stores)
      .leftJoin(storeProfiles, eq(storeProfiles.storeId, stores.id))
      .where(
        and(
          eq(stores.id, input.storeId),
          eq(stores.tenantId, input.tenantId),
          eq(stores.isDeleted, false),
          isNull(stores.deletedAt),
        ),
      )
      .limit(1);
    if (!store) throw unavailablePlanHire("store_unavailable");

    const account = await ensureTenantBillingAccount(txDb, input.tenantId);
    const effectiveItems = await findEffectivePlanItems(txDb, input);
    const currentPaid = effectiveItems.find((item) => item.unitAmountCents > 0);
    const sameEffective = effectiveItems.find(
      (item) => item.planId === plan.id,
    );
    const checkoutMode = planCheckoutMode(plan);
    const quote = await resolveBillingPlanQuote(txDb, {
      checkoutMode,
      planId: plan.id,
      ...(input.quoteId ? { quoteId: input.quoteId } : {}),
      storeId: input.storeId,
      tenantId: input.tenantId,
    });
    const freeActivation = sameEffective
      ? { itemId: sameEffective.id, status: "paid_active" as const }
      : checkoutMode === "free" && !currentPaid
        ? await scheduleFreePlanContract(txDb, {
            plan,
            storeId: input.storeId,
            subscription: account.subscription,
            tenantId: input.tenantId,
          })
        : null;
    const status = freeActivation?.status ?? "created";
    const [hire] = await txDb
      .insert(billingPlanHires)
      .values({
        ...(status === "paid_active"
          ? { activatedAt: now, completedAt: now }
          : {}),
        catalogVersion,
        checkoutMode,
        effectiveAt: currentPaid
          ? (account.subscription.currentPeriodEnd ?? now)
          : null,
        effectiveSubscriptionItemId: freeActivation?.itemId ?? null,
        idempotencyKey: input.idempotencyKey,
        planId: plan.id,
        planSnapshot: {
          code: plan.code,
          name: plan.name,
          selectionRank: planSelectionRank(plan),
        },
        quotedCents: quote?.quotedCents ?? plan.monthlyPriceCents,
        quoteId: quote?.id ?? null,
        status,
        storeId: input.storeId,
        subscriptionId: account.subscription.id,
        tenantId: input.tenantId,
      })
      .returning();
    if (!hire) throw new Error("Billing plan hire was not persisted.");
    if (quote) {
      await txDb
        .update(billingPlanQuotes)
        .set({ status: "used", updatedAt: now })
        .where(eq(billingPlanQuotes.id, quote.id));
    }
    await recordPlanHireTransition(
      txDb,
      hire,
      null,
      status as BillingPlanHireStatus,
    );
    await recordBillingProductEvent(txDb, {
      eventName: "hire_created",
      hireId: hire.id,
      idempotencyKey: `billing-hire:${hire.id}:created`,
      properties: {
        catalogVersion,
        checkoutMode,
        planId: plan.id,
        quotedCents: hire.quotedCents,
      },
      requestId: input.requestId ?? null,
      storeId: hire.storeId,
      tenantId: hire.tenantId,
    });
    return {
      billingTypes: input.billingTypes,
      created: true,
      customerData: {
        cpfCnpj: account.customer.documentNumber,
        email: account.customer.email,
        name: store.name,
        phone: store.phone,
      },
      hire: toPlanHire(hire, null),
      providerTransition: currentPaid
        ? {
            effectiveAt: account.subscription.currentPeriodEnd ?? now,
            providerCustomerId: account.customer.providerCustomerId,
            providerSubscriptionId: account.subscription.providerSubscriptionId,
          }
        : null,
    };
  });
}

async function lockPlanHire(db: DrizzleBillingClient, input: PrepareHireInput) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`${input.tenantId}:${input.storeId}:plan-hire`}, 31))`,
  );
}

async function findExistingHire(
  db: DrizzleBillingClient,
  input: PrepareHireInput,
) {
  const [existing] = await db
    .select()
    .from(billingPlanHires)
    .where(
      and(
        eq(billingPlanHires.tenantId, input.tenantId),
        eq(billingPlanHires.storeId, input.storeId),
        eq(billingPlanHires.idempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1);
  if (!existing) return null;
  assertIdempotentHireMatches(existing, input);
  const [checkout] = await db
    .select({ checkoutUrl: billingCheckoutSessions.checkoutUrl })
    .from(billingCheckoutSessions)
    .where(eq(billingCheckoutSessions.planHireId, existing.id))
    .orderBy(desc(billingCheckoutSessions.createdAt))
    .limit(1);
  return {
    billingTypes: input.billingTypes,
    created: false,
    customerData: null,
    hire: toPlanHire(existing, checkout?.checkoutUrl ?? null),
    providerTransition: null,
  };
}

export function assertIdempotentHireMatches(
  existing: Pick<typeof billingPlanHires.$inferSelect, "planId" | "quoteId">,
  input: Pick<PrepareHireInput, "planId" | "quoteId">,
) {
  if (
    existing.planId !== input.planId ||
    existing.quoteId !== (input.quoteId ?? null)
  ) {
    throw unavailablePlanHire("idempotency_key_conflict");
  }
}

async function assertNoOpenHire(
  db: DrizzleBillingClient,
  input: PrepareHireInput,
) {
  const [openHire] = await db
    .select({ id: billingPlanHires.id })
    .from(billingPlanHires)
    .where(
      and(
        eq(billingPlanHires.tenantId, input.tenantId),
        eq(billingPlanHires.storeId, input.storeId),
        inArray(billingPlanHires.status, [
          "created",
          "checkout_created",
          "payment_pending",
          "activation_pending",
        ]),
      ),
    )
    .limit(1);
  if (openHire) throw unavailablePlanHire("hire_in_progress");
}
