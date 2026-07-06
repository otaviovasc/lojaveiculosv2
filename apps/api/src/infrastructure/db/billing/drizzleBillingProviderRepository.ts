import { desc, eq } from "drizzle-orm";
import { billingCustomers, subscriptions } from "@lojaveiculosv2/db";
import type {
  BillingProviderAccount,
  BillingProviderCustomerRecord,
  BillingProviderRepository,
  BillingProviderSubscriptionRecord,
} from "../../../domains/billing/ports/billingProviderRepository.js";
import {
  createDrizzleBillingRepository,
  type DrizzleBillingClient,
} from "./drizzleBillingRepository.js";

export function createDrizzleBillingProviderRepository(
  db: DrizzleBillingClient,
): BillingProviderRepository {
  const billingRepository = createDrizzleBillingRepository(db);

  return {
    async getProviderAccount(input): Promise<BillingProviderAccount | null> {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, input.tenantId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);
      if (!subscription) return null;

      const [billingCustomer] = await db
        .select()
        .from(billingCustomers)
        .where(eq(billingCustomers.id, subscription.billingCustomerId))
        .limit(1);
      if (!billingCustomer) return null;

      const overview = await billingRepository.getOverview({
        ...(input.billingManagedBy
          ? { billingManagedBy: input.billingManagedBy }
          : {}),
        ...(typeof input.currentActorCanManage === "boolean"
          ? { currentActorCanManage: input.currentActorCanManage }
          : {}),
        storeId: input.storeId as never,
        tenantId: input.tenantId as never,
      });
      return {
        billingCustomer: toCustomerRecord(billingCustomer),
        chargePreview: overview.chargePreview,
        subscription: toSubscriptionRecord(subscription),
      };
    },
    async saveProviderCustomer(input) {
      const [row] = await db
        .update(billingCustomers)
        .set({
          provider: input.provider,
          providerCustomerId: input.providerCustomerId,
          updatedAt: new Date(),
        })
        .where(eq(billingCustomers.id, input.billingCustomerId))
        .returning();
      return row ? toCustomerRecord(row) : null;
    },
    async saveProviderSubscription(input) {
      const [row] = await db
        .update(subscriptions)
        .set({
          currentPeriodEnd: input.currentPeriodEnd,
          currentPeriodStart: input.currentPeriodStart,
          provider: input.provider,
          providerSubscriptionId: input.providerSubscriptionId,
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, input.subscriptionId))
        .returning();
      return row ? toSubscriptionRecord(row) : null;
    },
  };
}

function toCustomerRecord(
  row: typeof billingCustomers.$inferSelect,
): BillingProviderCustomerRecord {
  return {
    documentNumber: row.documentNumber,
    email: row.email,
    id: row.id,
    name: row.name,
    provider: row.provider as "asaas",
    providerCustomerId: row.providerCustomerId,
  };
}

function toSubscriptionRecord(
  row: typeof subscriptions.$inferSelect,
): BillingProviderSubscriptionRecord {
  return {
    currentPeriodEnd: row.currentPeriodEnd,
    currentPeriodStart: row.currentPeriodStart,
    id: row.id,
    provider: row.provider as "asaas",
    providerSubscriptionId: row.providerSubscriptionId,
    status: row.status,
  };
}
