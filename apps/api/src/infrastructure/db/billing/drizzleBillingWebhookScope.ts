import { and, desc, eq } from "drizzle-orm";
import { billingPlanHires, payments, subscriptions } from "@lojaveiculosv2/db";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import {
  findProviderSubscriptionScope,
  paymentScopeMatchesHire,
  providerIdentitiesMatchHire,
  providerIdentitiesMatchSubscriptionScope,
  providerScopedIdentitiesCanBind,
} from "./drizzleBillingWebhookIdentity.js";

export async function resolvePaymentScope(
  db: DrizzleBillingClient,
  input: UpsertBillingProviderPaymentInput,
) {
  const referencedHire = input.externalReference
    ? await findReferencedHire(db, input.externalReference)
    : null;
  if (
    !externalReferenceMatchesCandidate(
      input.externalReference,
      referencedHire,
      referencedHire,
    )
  ) {
    return null;
  }
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
    if (
      !existingPayment.storeId ||
      !existingPayment.subscriptionId ||
      !existingPayment.tenantId
    ) {
      return null;
    }
    const existingPaymentScope = {
      storeId: existingPayment.storeId,
      subscriptionId: existingPayment.subscriptionId,
      tenantId: existingPayment.tenantId,
    };
    const hire = await findHireForPayment(db, {
      externalReference:
        input.externalReference ?? existingPayment.externalReference,
      ...(input.providerCheckoutId !== undefined
        ? { providerCheckoutId: input.providerCheckoutId }
        : {}),
      providerPaymentId: input.providerPaymentId,
      providerSubscriptionId: input.providerSubscriptionId,
    });
    if (
      (referencedHire || input.providerCheckoutId) &&
      !externalReferenceMatchesCandidate(
        input.externalReference,
        referencedHire,
        hire,
      )
    ) {
      return null;
    }
    if (
      hire &&
      (!paymentScopeMatchesHire(existingPayment, hire) ||
        !(await providerIdentitiesMatchHire(db, hire, input, true)))
    ) {
      return null;
    }
    if (
      !(await providerIdentitiesMatchSubscriptionScope(
        db,
        existingPaymentScope,
        input,
      ))
    ) {
      return null;
    }
    return {
      hireId: hire?.id ?? null,
      ...existingPaymentScope,
    };
  }

  if (input.providerSubscriptionId) {
    const hire = await findHireForPayment(db, input);
    if (hire && (await providerIdentitiesMatchHire(db, hire, input))) {
      return hireScope(hire);
    }
    const subscription = await findProviderSubscriptionScope(db, input);
    if (subscription) {
      if (input.providerCheckoutId || referencedHire) return null;
      if (!providerScopedIdentitiesCanBind(subscription, input)) return null;
      return {
        hireId: null,
        storeId: subscription.storeId,
        subscriptionId: subscription.id,
        tenantId: subscription.tenantId,
      };
    }
  }

  if (input.providerCheckoutId || input.externalReference) {
    const hire = await findHireForPayment(db, input);
    if (hire && (await providerIdentitiesMatchHire(db, hire, input))) {
      return hireScope(hire);
    }
  }

  return null;
}

async function findReferencedHire(
  db: DrizzleBillingClient,
  externalReference: string,
) {
  const [hire] = await db
    .select()
    .from(billingPlanHires)
    .where(eq(billingPlanHires.id, externalReference))
    .limit(1);
  return hire ?? null;
}

export function externalReferenceMatchesCandidate<T extends { id: string }>(
  externalReference: string | null | undefined,
  referencedHire: T | null,
  candidate: T | null,
) {
  return externalReference
    ? Boolean(referencedHire && referencedHire.id === candidate?.id)
    : true;
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
  const [subscription] = await db
    .select({ storeId: subscriptions.storeId })
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);
  return subscription?.storeId ?? null;
}
