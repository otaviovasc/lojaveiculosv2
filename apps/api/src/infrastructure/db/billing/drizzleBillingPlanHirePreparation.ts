import { and, eq, isNull, lte } from "drizzle-orm";
import {
  billingPlanHires,
  billingPlanQuotes,
  plans,
  storeProfiles,
  stores,
} from "@lojaveiculosv2/db";
import type { BillingPlanHireStatus } from "../../../domains/billing/ports/billingPlanHireRepository.js";
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
import {
  expireStaleOpenHires,
  findExistingHire,
  lockPlanHire,
  type PrepareHireInput,
} from "./drizzleBillingPlanHirePreparationExisting.js";
import { enqueueBillingAudit } from "./drizzleBillingAuditOutboxMutation.js";

export { assertIdempotentHireMatches } from "./drizzleBillingPlanHirePreparationExisting.js";

export async function prepareBillingPlanHire(
  db: DrizzleBillingClient,
  input: PrepareHireInput,
) {
  return db.transaction(async (tx) => {
    const txDb = tx as DrizzleBillingClient;
    await lockPlanHire(txDb, input);
    const existing = await findExistingHire(txDb, input);
    if (existing) {
      await enqueueBillingAudit(txDb, {
        action: "billing.plan_hire.created",
        audit: input.audit,
        entityId: existing.hire.id,
        entityType: "billing_plan_hire",
        idempotencyKey: `billing-audit:hire:${existing.hire.id}:created`,
        metadata: {
          catalogVersion: existing.hire.catalogVersion,
          planId: existing.hire.planId,
          quotedCents: existing.hire.quotedCents,
          status: existing.hire.status,
        },
        occurredAt: existing.hire.createdAt,
        storeId: existing.hire.storeId,
        tenantId: existing.hire.tenantId,
      });
      return existing;
    }
    await expireStaleOpenHires(txDb, input);

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
        and(
          eq(stores.id, input.storeId),
          eq(stores.tenantId, input.tenantId),
          eq(stores.isDeleted, false),
          isNull(stores.deletedAt),
        ),
      )
      .limit(1);
    if (!store) throw unavailablePlanHire("store_unavailable");

    const account = await ensureTenantBillingAccount(
      txDb,
      input.tenantId,
      input.storeId,
      {
        contactEmail: store.contactEmail,
        documentNumber: store.documentNumber,
      },
    );
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
    await enqueueBillingAudit(txDb, {
      action: "billing.plan_hire.created",
      audit: input.audit,
      entityId: hire.id,
      entityType: "billing_plan_hire",
      idempotencyKey: `billing-audit:hire:${hire.id}:created`,
      metadata: {
        catalogVersion,
        planId: plan.id,
        quotedCents: hire.quotedCents,
        status: hire.status,
      },
      occurredAt: hire.createdAt,
      storeId: hire.storeId,
      tenantId: hire.tenantId,
    });
    return {
      billingTypes: input.billingTypes,
      created: true,
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
