import { desc, eq } from "drizzle-orm";
import {
  billingCheckoutSessions,
  billingCustomers,
  subscriptions,
} from "@lojaveiculosv2/db";
import type {
  BillingProviderAccount,
  BillingProviderCheckoutRecord,
  BillingProviderCustomerRecord,
  BillingProviderRepository,
  BillingProviderSubscriptionRecord,
} from "../../../domains/billing/ports/billingProviderRepository.js";
import { getBillingProviderOverview } from "../../../domains/billing/readModels/getBillingProviderOverview.js";
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
    async saveProviderCheckout(input) {
      const [row] = await db
        .insert(billingCheckoutSessions)
        .values({
          callbackUrls: input.callbackUrls,
          checkoutUrl: input.checkoutUrl,
          expiresAt: input.expiresAt,
          externalReference: input.externalReference,
          provider: input.provider,
          providerCheckoutId: input.providerCheckoutId,
          raw: input.raw,
          status: input.status,
          storeId: input.storeId,
          subscriptionId: input.subscriptionId,
          tenantId: input.tenantId,
        })
        .onConflictDoUpdate({
          set: {
            callbackUrls: input.callbackUrls,
            checkoutUrl: input.checkoutUrl,
            expiresAt: input.expiresAt,
            externalReference: input.externalReference,
            raw: input.raw,
            status: input.status,
            storeId: input.storeId,
            subscriptionId: input.subscriptionId,
            tenantId: input.tenantId,
            updatedAt: new Date(),
          },
          target: [
            billingCheckoutSessions.provider,
            billingCheckoutSessions.providerCheckoutId,
          ],
        })
        .returning();
      return row ? toCheckoutRecord(row) : null;
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

function toCheckoutRecord(
  row: typeof billingCheckoutSessions.$inferSelect,
): BillingProviderCheckoutRecord {
  return {
    checkoutUrl: row.checkoutUrl,
    expiresAt: row.expiresAt,
    externalReference: row.externalReference,
    id: row.id,
    provider: row.provider as "asaas",
    providerCheckoutId: row.providerCheckoutId,
    status: row.status,
    storeId: row.storeId,
    subscriptionId: row.subscriptionId,
    tenantId: row.tenantId,
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
