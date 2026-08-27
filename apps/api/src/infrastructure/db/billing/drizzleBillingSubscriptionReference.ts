import { eq } from "drizzle-orm";
import { billingPlanHires } from "@lojaveiculosv2/db";
import type { subscriptions } from "@lojaveiculosv2/db";
import type {
  BillingProviderSyncResult,
  SyncBillingProviderSubscriptionInput,
} from "../../../domains/billing/ports/billingWebhookRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

type SubscriptionScope = Pick<
  typeof subscriptions.$inferSelect,
  "id" | "providerSubscriptionId" | "storeId" | "tenantId"
>;

export async function validateSubscriptionExternalReference(
  db: DrizzleBillingClient,
  input: SyncBillingProviderSubscriptionInput,
  subscription: SubscriptionScope,
): Promise<BillingProviderSyncResult | null> {
  if (!input.externalReference) return null;
  const [hire] = await db
    .select()
    .from(billingPlanHires)
    .where(eq(billingPlanHires.id, input.externalReference))
    .limit(1);
  return subscriptionReferenceMatchesScope(
    hire ?? null,
    subscription,
    input.providerSubscriptionId,
  )
    ? null
    : {
        reason: "unknown_or_conflicting_subscription_external_reference",
        status: "pending_reconciliation",
        storeId: subscription.storeId as never,
        tenantId: subscription.tenantId as never,
      };
}

export function subscriptionReferenceMatchesScope(
  hire: Pick<
    typeof billingPlanHires.$inferSelect,
    | "providerSubscriptionId"
    | "status"
    | "storeId"
    | "subscriptionId"
    | "tenantId"
  > | null,
  subscription: SubscriptionScope,
  incomingProviderSubscriptionId: string,
) {
  return Boolean(
    hire &&
    referenceableHireStatuses.has(hire.status) &&
    hire.tenantId === subscription.tenantId &&
    hire.storeId === subscription.storeId &&
    hire.subscriptionId === subscription.id &&
    hire.providerSubscriptionId === incomingProviderSubscriptionId &&
    subscription.providerSubscriptionId === incomingProviderSubscriptionId,
  );
}

const referenceableHireStatuses: ReadonlySet<string> = new Set([
  "activation_pending",
  "downgrade_scheduled",
  "paid_active",
  "reconciliation_failed",
]);
