import { and, eq, inArray } from "drizzle-orm";
import {
  billingAddonContracts,
  storeEntitlements,
  subscriptionItems,
} from "@lojaveiculosv2/db";
import { BillingAddonContractError } from "../../../domains/billing/ports/billingRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import {
  contractByRow,
  requireOpenContract,
} from "./drizzleBillingAddonContractSupport.js";

export async function markZapiAddonContractScheduled(
  db: DrizzleBillingClient,
  input: {
    contractId: string;
    expectedRenewalAmountCents: number;
    storeId: string;
    tenantId: string;
  },
) {
  const [updated] = await db
    .update(billingAddonContracts)
    .set({
      expectedRenewalAmountCents: input.expectedRenewalAmountCents,
      status: "scheduled",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(billingAddonContracts.id, input.contractId),
        eq(billingAddonContracts.storeId, input.storeId),
        eq(billingAddonContracts.tenantId, input.tenantId),
        eq(billingAddonContracts.status, "pending"),
      ),
    )
    .returning();
  return updated ? contractByRow(db, updated) : requireOpenContract(db, input);
}

export async function cancelZapiAddonContract(
  db: DrizzleBillingClient,
  input: { effectiveAt: Date; storeId: string; tenantId: string },
) {
  const current = await requireOpenContract(db, input);
  const now = new Date();
  const paid =
    current.status === "active" || current.status === "paid_awaiting_setup";
  const [updated] = await db
    .update(billingAddonContracts)
    .set({
      cancellationScheduledFor: paid ? input.effectiveAt : now,
      cancellationSyncPending: true,
      updatedAt: now,
    })
    .where(
      and(
        eq(billingAddonContracts.id, current.id),
        inArray(billingAddonContracts.status, [
          "pending",
          "scheduled",
          "paid_awaiting_setup",
          "active",
        ]),
      ),
    )
    .returning();
  if (updated) {
    await db
      .update(subscriptionItems)
      .set({ endsAt: paid ? input.effectiveAt : now, updatedAt: now })
      .where(eq(subscriptionItems.id, updated.subscriptionItemId));
    if (paid) {
      await db
        .update(storeEntitlements)
        .set({ endsAt: input.effectiveAt, updatedAt: now })
        .where(
          and(
            eq(storeEntitlements.storeId, input.storeId),
            eq(storeEntitlements.tenantId, input.tenantId),
            eq(storeEntitlements.featureKey, "crm_zapi"),
            inArray(storeEntitlements.status, ["active", "trialing"]),
          ),
        );
    }
    return contractByRow(db, updated);
  }
  return requireOpenContract(db, input);
}

export async function confirmZapiAddonCancellationSync(
  db: DrizzleBillingClient,
  input: { storeId: string; tenantId: string },
) {
  const current = await requireOpenContract(db, input);
  const paid =
    current.status === "active" || current.status === "paid_awaiting_setup";
  const now = new Date();
  const [updated] = await db
    .update(billingAddonContracts)
    .set({
      cancellationSyncPending: false,
      ...(paid ? {} : { cancelledAt: now, status: "cancelled" as const }),
      updatedAt: now,
    })
    .where(
      and(
        eq(billingAddonContracts.id, current.id),
        eq(billingAddonContracts.cancellationSyncPending, true),
      ),
    )
    .returning();
  return updated ? contractByRow(db, updated) : current;
}

export async function completeZapiAddonContractSetup(
  db: DrizzleBillingClient,
  input: { connectionId: string; storeId: string; tenantId: string },
) {
  const current = await requireOpenContract(db, input);
  if (current.status === "active") return current;
  if (current.status !== "paid_awaiting_setup") {
    throw new BillingAddonContractError(
      "Z-API setup cannot complete before the renewal payment.",
    );
  }
  const [updated] = await db
    .update(billingAddonContracts)
    .set({
      setupCompletedAt: new Date(),
      setupConnectionId: input.connectionId,
      status: "active",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(billingAddonContracts.id, current.id),
        eq(billingAddonContracts.status, "paid_awaiting_setup"),
      ),
    )
    .returning();
  return updated ? contractByRow(db, updated) : requireOpenContract(db, input);
}
