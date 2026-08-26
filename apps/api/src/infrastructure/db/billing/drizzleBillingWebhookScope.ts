import { and, desc, eq } from "drizzle-orm";
import {
  billingPlanHires,
  payments,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function resolvePaymentScope(
  db: DrizzleBillingClient,
  input: UpsertBillingProviderPaymentInput,
) {
  const [existingPayment] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.provider, input.provider),
        eq(payments.providerPaymentId, input.providerPaymentId),
      ),
    )
    .limit(1);
  if (existingPayment) {
    const explicitHireReference = await referencesKnownHire(
      db,
      input.externalReference,
    );
    const hire = await findHireForPayment(db, {
      externalReference:
        input.externalReference ?? existingPayment.externalReference,
      ...(input.providerCheckoutId !== undefined
        ? { providerCheckoutId: input.providerCheckoutId }
        : {}),
      providerPaymentId: input.providerPaymentId,
      providerSubscriptionId: input.providerSubscriptionId,
    });
    if ((explicitHireReference || input.providerCheckoutId) && !hire) {
      return null;
    }
    return {
      hireId: hire?.id ?? null,
      storeId: existingPayment.storeId,
      subscriptionId: existingPayment.subscriptionId,
      tenantId: existingPayment.tenantId,
    };
  }

  if (input.providerSubscriptionId) {
    const explicitHireReference = await referencesKnownHire(
      db,
      input.externalReference,
    );
    const hire = await findHireForPayment(db, input);
    if (hire) return hireScope(hire);
    const subscription = await findSubscription(db, input);
    if (subscription) {
      if (input.providerCheckoutId || explicitHireReference) return null;
      return {
        storeId: await resolveStoreId(db, subscription.id),
        subscriptionId: subscription.id,
        tenantId: subscription.tenantId,
      };
    }
  }

  if (input.providerCheckoutId || input.externalReference) {
    const hire = await findHireForPayment(db, input);
    if (hire) return hireScope(hire);
  }

  return null;
}

async function referencesKnownHire(
  db: DrizzleBillingClient,
  externalReference: string | null | undefined,
) {
  if (!externalReference) return false;
  const [hire] = await db
    .select({ id: billingPlanHires.id })
    .from(billingPlanHires)
    .where(eq(billingPlanHires.id, externalReference))
    .limit(1);
  return Boolean(hire);
}

async function findHireForPayment(
  db: DrizzleBillingClient,
  input: {
    externalReference?: string | null;
    providerCheckoutId?: string | null;
    providerPaymentId?: string | null;
    providerSubscriptionId?: string | null;
  },
) {
  const evidence: Array<Array<typeof billingPlanHires.$inferSelect>> = [];
  if (input.providerPaymentId) {
    await appendHireEvidence(
      db,
      evidence,
      eq(billingPlanHires.providerPaymentId, input.providerPaymentId),
    );
  }
  if (input.providerSubscriptionId) {
    await appendHireEvidence(
      db,
      evidence,
      eq(billingPlanHires.providerSubscriptionId, input.providerSubscriptionId),
    );
  }
  if (input.providerCheckoutId) {
    await appendHireEvidence(
      db,
      evidence,
      eq(billingPlanHires.providerCheckoutId, input.providerCheckoutId),
    );
  }
  if (input.externalReference) {
    await appendHireEvidence(
      db,
      evidence,
      eq(billingPlanHires.id, input.externalReference),
    );
  }
  return chooseCorrelatedHire(evidence);
}

async function appendHireEvidence(
  db: DrizzleBillingClient,
  evidence: Array<Array<typeof billingPlanHires.$inferSelect>>,
  condition: ReturnType<typeof eq>,
) {
  const rows = await db
    .select()
    .from(billingPlanHires)
    .where(condition)
    .orderBy(desc(billingPlanHires.createdAt))
    .limit(20);
  if (rows.length) evidence.push(rows);
}

export function chooseCorrelatedHire<
  T extends {
    id: string;
    status: (typeof billingPlanHires.$inferSelect)["status"];
  },
>(evidence: ReadonlyArray<ReadonlyArray<T>>): T | null {
  if (!evidence.length) return null;
  const commonIds = new Set(evidence[0]!.map((hire) => hire.id));
  for (const candidates of evidence.slice(1)) {
    const candidateIds = new Set(candidates.map((hire) => hire.id));
    for (const id of commonIds) {
      if (!candidateIds.has(id)) commonIds.delete(id);
    }
  }
  const candidates = evidence[0]!.filter((hire) => commonIds.has(hire.id));
  if (candidates.length === 1) return candidates[0] ?? null;
  const actionable = candidates.filter(
    (hire) =>
      hire.status !== "paid_active" && hire.status !== "downgrade_scheduled",
  );
  return actionable.length === 1 ? (actionable[0] ?? null) : null;
}

function hireScope(hire: typeof billingPlanHires.$inferSelect) {
  return {
    hireId: hire.id,
    storeId: hire.storeId,
    subscriptionId: hire.subscriptionId,
    tenantId: hire.tenantId,
  };
}

export async function resolveStoreId(
  db: DrizzleBillingClient,
  subscriptionId: string,
): Promise<string | null> {
  const rows = await db
    .select()
    .from(subscriptionItems)
    .where(eq(subscriptionItems.subscriptionId, subscriptionId))
    .limit(20);
  const storeIds = [...new Set(rows.map((row) => row.storeId).filter(Boolean))];
  return storeIds.length === 1 ? (storeIds[0] ?? null) : null;
}

async function findSubscription(
  db: DrizzleBillingClient,
  input: UpsertBillingProviderPaymentInput,
) {
  if (!input.providerSubscriptionId) return null;
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.provider, input.provider),
        eq(subscriptions.providerSubscriptionId, input.providerSubscriptionId),
      ),
    )
    .limit(1);
  return subscription ?? null;
}
