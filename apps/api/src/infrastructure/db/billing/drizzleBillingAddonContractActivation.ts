import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { billingAddonContracts } from "@lojaveiculosv2/db";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { billingDate } from "./drizzleBillingAddonContractSupport.js";

export async function activateInitialZapiContractAfterCheckout(
  db: DrizzleBillingClient,
  input: {
    paidAt: Date;
    providerCheckoutId: string;
    storeId?: string;
    subscriptionId: string;
    tenantId: string;
  },
) {
  return db
    .update(billingAddonContracts)
    .set({
      activatedByProviderCheckoutId: input.providerCheckoutId,
      paidAt: input.paidAt,
      status: "paid_awaiting_setup",
      updatedAt: input.paidAt,
    })
    .where(
      and(
        eq(billingAddonContracts.subscriptionId, input.subscriptionId),
        ...(input.storeId
          ? [eq(billingAddonContracts.storeId, input.storeId)]
          : []),
        eq(billingAddonContracts.tenantId, input.tenantId),
        eq(billingAddonContracts.status, "pending"),
        isNull(billingAddonContracts.scheduledFor),
      ),
    )
    .returning();
}

export async function activateZapiContractsForPaidRenewal(
  db: DrizzleBillingClient,
  input: {
    dueAt: Date;
    paidAt: Date;
    paymentId: string;
    amountCents: number;
    providerEventId: string;
    subscriptionId: string;
  },
) {
  const contracts = await db
    .select()
    .from(billingAddonContracts)
    .where(
      and(
        eq(billingAddonContracts.subscriptionId, input.subscriptionId),
        sql`(${billingAddonContracts.scheduledFor} at time zone 'UTC')::date = ${billingDate(input.dueAt)}::date`,
        eq(billingAddonContracts.expectedRenewalAmountCents, input.amountCents),
        eq(billingAddonContracts.status, "scheduled"),
      ),
    )
    .limit(100);
  for (const contract of contracts) {
    await db
      .update(billingAddonContracts)
      .set({
        activatedByPaymentId: input.paymentId,
        activatedByProviderEventId: input.providerEventId,
        paidAt: input.paidAt,
        status: "paid_awaiting_setup",
        updatedAt: input.paidAt,
      })
      .where(
        and(
          eq(billingAddonContracts.id, contract.id),
          eq(billingAddonContracts.status, "scheduled"),
        ),
      );
  }
  const cancellations = await db
    .select()
    .from(billingAddonContracts)
    .where(
      and(
        eq(billingAddonContracts.subscriptionId, input.subscriptionId),
        sql`(${billingAddonContracts.cancellationScheduledFor} at time zone 'UTC')::date = ${billingDate(input.dueAt)}::date`,
        inArray(billingAddonContracts.status, [
          "paid_awaiting_setup",
          "active",
        ]),
      ),
    )
    .limit(100);
  for (const contract of cancellations) {
    await db
      .update(billingAddonContracts)
      .set({
        cancelledAt: input.paidAt,
        status: "cancelled",
        updatedAt: input.paidAt,
      })
      .where(eq(billingAddonContracts.id, contract.id));
  }
  return [...contracts, ...cancellations];
}
