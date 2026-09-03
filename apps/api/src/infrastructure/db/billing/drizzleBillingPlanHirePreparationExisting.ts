import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  billingCheckoutSessions,
  billingCustomers,
  billingPlanHires,
  storeProfiles,
  stores,
  subscriptions,
} from "@lojaveiculosv2/db";
import type { BillingPlanHireRepository } from "../../../domains/billing/ports/billingPlanHireRepository.js";
import { findEffectivePlanItems } from "./drizzleBillingPlanHireContracts.js";
import {
  recordPlanHireTransition,
  toPlanHire,
  unavailablePlanHire,
} from "./drizzleBillingPlanHireSupport.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export type PrepareHireInput = Parameters<
  BillingPlanHireRepository["prepareHire"]
>[0];

export async function lockPlanHire(
  db: DrizzleBillingClient,
  input: PrepareHireInput,
) {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`${input.tenantId}:${input.storeId}:plan-hire`}, 31))`,
  );
}

export async function findExistingHire(
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
  const canResumeCheckout =
    !checkout && ["created", "payment_pending"].includes(existing.status);
  const resumeContext = canResumeCheckout
    ? await loadExistingHireResumeContext(db, existing, input)
    : null;
  return {
    billingTypes: input.billingTypes,
    created: false,
    customerData: resumeContext?.customerData ?? null,
    hire: toPlanHire(existing, checkout?.checkoutUrl ?? null),
    providerTransition: resumeContext?.providerTransition ?? null,
  };
}

async function loadExistingHireResumeContext(
  db: DrizzleBillingClient,
  existing: typeof billingPlanHires.$inferSelect,
  input: PrepareHireInput,
) {
  const [store] = await db
    .select({
      addressDistrict: storeProfiles.addressDistrict,
      addressLine1: storeProfiles.addressLine1,
      addressNumber: storeProfiles.addressNumber,
      addressZipCode: storeProfiles.addressZipCode,
      contactEmail: storeProfiles.contactEmail,
      documentNumber: storeProfiles.documentNumber,
      name: stores.tradingName,
      phone: storeProfiles.contactPhone,
    })
    .from(stores)
    .leftJoin(storeProfiles, eq(storeProfiles.storeId, stores.id))
    .where(
      and(eq(stores.id, input.storeId), eq(stores.tenantId, input.tenantId)),
    )
    .limit(1);
  const [account] = await db
    .select({ customer: billingCustomers, subscription: subscriptions })
    .from(subscriptions)
    .innerJoin(
      billingCustomers,
      and(
        eq(billingCustomers.id, subscriptions.billingCustomerId),
        eq(billingCustomers.tenantId, subscriptions.tenantId),
      ),
    )
    .where(
      and(
        eq(subscriptions.id, existing.subscriptionId),
        eq(subscriptions.storeId, existing.storeId),
        eq(subscriptions.tenantId, existing.tenantId),
      ),
    )
    .limit(1);
  if (!store || !account) throw unavailablePlanHire("store_unavailable");
  const effectiveItems = await findEffectivePlanItems(db, input);
  const hasCurrentPaid = effectiveItems.some(
    (item) => item.unitAmountCents > 0,
  );
  return {
    customerData: {
      address: store.addressLine1,
      addressNumber: store.addressNumber,
      cpfCnpj: account.customer.documentNumber ?? store.documentNumber,
      email: account.customer.email ?? store.contactEmail,
      name: store.name,
      phone: store.phone,
      postalCode: store.addressZipCode,
      province: store.addressDistrict,
    },
    providerTransition: hasCurrentPaid
      ? {
          effectiveAt:
            existing.effectiveAt ??
            account.subscription.currentPeriodEnd ??
            existing.createdAt,
          providerCustomerId: account.customer.providerCustomerId,
          providerSubscriptionId: account.subscription.providerSubscriptionId,
        }
      : null,
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

export const OPEN_PLAN_HIRE_STATUSES = [
  "created",
  "checkout_created",
  "payment_pending",
  "activation_pending",
] as const;

// Hires without any checkout session get a grace window beyond the 60-minute
// provider checkout TTL before they are considered abandoned.
export const STALE_HIRE_WITHOUT_SESSION_MS = 70 * 60 * 1000;

export async function expireStaleOpenHires(
  db: DrizzleBillingClient,
  input: PrepareHireInput,
) {
  const openHires = await db
    .select()
    .from(billingPlanHires)
    .where(
      and(
        eq(billingPlanHires.tenantId, input.tenantId),
        eq(billingPlanHires.storeId, input.storeId),
        inArray(billingPlanHires.status, [...OPEN_PLAN_HIRE_STATUSES]),
      ),
    );
  if (openHires.length === 0) return;

  const now = new Date();
  const staleWithoutSessionBefore = new Date(
    now.getTime() - STALE_HIRE_WITHOUT_SESSION_MS,
  );
  let blocking = 0;
  for (const hire of openHires) {
    const [session] = await db
      .select({ expiresAt: billingCheckoutSessions.expiresAt })
      .from(billingCheckoutSessions)
      .where(
        and(
          eq(billingCheckoutSessions.planHireId, hire.id),
          eq(billingCheckoutSessions.tenantId, hire.tenantId),
          eq(billingCheckoutSessions.storeId, hire.storeId),
        ),
      )
      .orderBy(desc(billingCheckoutSessions.createdAt))
      .limit(1);
    const stale = session
      ? session.expiresAt !== null && session.expiresAt < now
      : hire.updatedAt < staleWithoutSessionBefore;
    if (!stale) {
      blocking += 1;
      continue;
    }
    const fromStatus = hire.status as (typeof OPEN_PLAN_HIRE_STATUSES)[number];
    const [expired] = await db
      .update(billingPlanHires)
      .set({
        failureCode: "checkout_expired",
        status: "expired",
        updatedAt: now,
      })
      .where(eq(billingPlanHires.id, hire.id))
      .returning();
    await recordPlanHireTransition(
      db,
      expired ?? hire,
      fromStatus,
      "expired",
      "checkout_expired",
    );
  }
  if (blocking > 0) throw unavailablePlanHire("hire_in_progress");
}
