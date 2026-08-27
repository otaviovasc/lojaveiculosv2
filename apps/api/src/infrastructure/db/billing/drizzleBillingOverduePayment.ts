import { and, eq } from "drizzle-orm";
import { payments, subscriptions } from "@lojaveiculosv2/db";
import { lockEffectivePlanContract } from "./drizzleBillingContractLock.js";
import {
  currentPlanItemGrantsPaidAccess,
  findCurrentEffectivePlanItem,
} from "./drizzleBillingEffectivePlanItem.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function overduePaymentCanEnterGrace(
  db: DrizzleBillingClient,
  input: {
    dueAt: Date | null;
    paymentId: string;
    provider: "asaas";
    providerPaymentId: string;
    providerSubscriptionId: string | null;
    storeId: string | null;
    subscriptionId: string;
    tenantId: string;
  },
) {
  if (!input.storeId || !input.dueAt || !input.providerSubscriptionId) {
    return false;
  }
  await lockEffectivePlanContract(db, input.tenantId, input.storeId);
  const now = new Date();
  const [current] = await db
    .select({
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      currentPeriodStart: subscriptions.currentPeriodStart,
      provider: subscriptions.provider,
      providerSubscriptionId: subscriptions.providerSubscriptionId,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.id, input.subscriptionId),
        eq(subscriptions.storeId, input.storeId),
        eq(subscriptions.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!current) return false;
  const effectivePaid = await findCurrentEffectivePlanItem(db, {
    now,
    storeId: input.storeId,
    subscriptionId: input.subscriptionId,
    tenantId: input.tenantId,
  });
  if (!effectivePaid || !currentPlanItemGrantsPaidAccess(effectivePaid)) {
    return false;
  }
  const [payment] = await db
    .select({ amountCents: payments.amountCents, dueAt: payments.dueAt })
    .from(payments)
    .where(
      and(
        eq(payments.id, input.paymentId),
        eq(payments.provider, input.provider),
        eq(payments.providerPaymentId, input.providerPaymentId),
        eq(payments.subscriptionId, input.subscriptionId),
        eq(payments.storeId, input.storeId),
        eq(payments.tenantId, input.tenantId),
        eq(payments.status, "overdue"),
        eq(payments.dueAt, input.dueAt),
      ),
    )
    .limit(1);
  return Boolean(
    payment &&
    payment.amountCents === effectivePaid.unitAmountCents &&
    overdueEvidenceCanEnterGrace({
      currentPeriodEnd: current.currentPeriodEnd,
      currentPeriodStart: current.currentPeriodStart,
      dueAt: payment.dueAt,
      provider: input.provider,
      providerSubscriptionId: input.providerSubscriptionId,
      status: current.status,
      subscriptionProvider: current.provider,
      subscriptionProviderId: current.providerSubscriptionId,
    }),
  );
}

export function overdueEvidenceCanEnterGrace(input: {
  currentPeriodEnd: Date | null;
  currentPeriodStart: Date | null;
  dueAt: Date | null;
  provider: string;
  providerSubscriptionId: string | null;
  status: (typeof subscriptions.$inferSelect)["status"];
  subscriptionProvider: string;
  subscriptionProviderId: string | null;
}) {
  return Boolean(
    (input.status === "active" || input.status === "past_due") &&
    input.currentPeriodStart &&
    input.currentPeriodEnd &&
    input.dueAt &&
    input.dueAt > input.currentPeriodStart &&
    input.dueAt <= input.currentPeriodEnd &&
    input.provider === input.subscriptionProvider &&
    input.providerSubscriptionId &&
    input.providerSubscriptionId === input.subscriptionProviderId,
  );
}

export function overdueFallsWithinCurrentPeriod(
  dueAt: Date | null,
  currentPeriodStart: Date | null,
  currentPeriodEnd: Date | null,
) {
  return Boolean(
    dueAt &&
    currentPeriodStart &&
    currentPeriodEnd &&
    dueAt >= currentPeriodStart &&
    dueAt <= currentPeriodEnd,
  );
}
