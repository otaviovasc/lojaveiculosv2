import { and, desc, eq, isNull, or } from "drizzle-orm";
import { billingCustomers, subscriptions } from "@lojaveiculosv2/db";
import type {
  BillingProviderAccount,
  BillingProviderCustomerRecord,
  BillingProviderRepository,
  BillingProviderSubscriptionRecord,
} from "../../../domains/billing/ports/billingProviderRepository.js";
import { getBillingProviderOverview } from "../../../domains/billing/readModels/getBillingProviderOverview.js";
import {
  createDrizzleBillingRepository,
  type DrizzleBillingClient,
} from "./drizzleBillingRepository.js";
import { saveDrizzleBillingProviderSubscription } from "./drizzleBillingProviderSubscriptionSave.js";

export function createDrizzleBillingProviderRepository(
  db: DrizzleBillingClient,
): BillingProviderRepository {
  const billingRepository = createDrizzleBillingRepository(db);

  return {
    async getProviderAccount(input): Promise<BillingProviderAccount | null> {
      if (!input.storeId) return null;
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, input.tenantId),
            eq(subscriptions.storeId, input.storeId),
          ),
        )
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);
      if (!subscription) return null;

      const [billingCustomer] = await db
        .select()
        .from(billingCustomers)
        .where(eq(billingCustomers.id, subscription.billingCustomerId))
        .limit(1);
      if (!billingCustomer) return null;

      const overview = await getBillingProviderOverview(
        billingRepository,
        input,
      );
      return {
        billingCustomer: toCustomerRecord(billingCustomer),
        chargePreview: overview.chargePreview,
        subscription: toSubscriptionRecord(subscription),
      };
    },
    async saveProviderCustomer(input) {
      const [ownedSubscription] = await db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.billingCustomerId, input.billingCustomerId),
            eq(subscriptions.tenantId, input.tenantId),
            eq(subscriptions.storeId, input.storeId),
          ),
        )
        .limit(1);
      if (!ownedSubscription) return null;
      const [row] = await db
        .update(billingCustomers)
        .set({
          provider: input.provider,
          providerCustomerId: input.providerCustomerId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(billingCustomers.id, input.billingCustomerId),
            eq(billingCustomers.tenantId, input.tenantId),
            or(
              isNull(billingCustomers.providerCustomerId),
              eq(billingCustomers.providerCustomerId, input.providerCustomerId),
            ),
          ),
        )
        .returning();
      return row ? toCustomerRecord(row) : null;
    },
    async saveProviderSubscription(input) {
      const row = await saveDrizzleBillingProviderSubscription(db, input);
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
