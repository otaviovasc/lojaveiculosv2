import { and, desc, eq } from "drizzle-orm";
import {
  addons,
  billingAddonContracts,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import {
  BillingAddonContractError,
  type BillingAddonContract,
} from "../../../domains/billing/ports/billingRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import {
  findOpenContract,
  toContract,
} from "./drizzleBillingAddonContractSupport.js";

export async function requestZapiAddonContract(
  db: DrizzleBillingClient,
  input: {
    addonId: string;
    scheduledFor: Date;
    storeId: string;
    tenantId: string;
  },
): Promise<BillingAddonContract> {
  const current = await findOpenContract(db, input);
  if (current) return current;

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, input.tenantId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  const [addon] = await db
    .select()
    .from(addons)
    .where(and(eq(addons.id, input.addonId), eq(addons.code, "crm_zapi")))
    .limit(1);
  if (!subscription || !addon) {
    throw new BillingAddonContractError(
      "Z-API billing contract is unavailable.",
    );
  }

  const [item] = await db
    .insert(subscriptionItems)
    .values({
      addonId: addon.id,
      itemType: "addon",
      quantity: 1,
      startsAt: input.scheduledFor,
      storeId: input.storeId,
      subscriptionId: subscription.id,
      tenantId: input.tenantId,
      unitAmountCents: addon.monthlyPriceCents,
    })
    .returning();
  if (!item) throw new Error("Z-API subscription item was not persisted.");

  const [contract] = await db
    .insert(billingAddonContracts)
    .values({
      addonId: addon.id,
      scheduledFor: input.scheduledFor,
      status: "pending",
      storeId: input.storeId,
      subscriptionId: subscription.id,
      subscriptionItemId: item.id,
      tenantId: input.tenantId,
    })
    .returning();
  if (!contract) throw new Error("Z-API billing contract was not persisted.");
  return toContract(contract, addon);
}

export async function ensureInitialZapiContractForCheckout(
  db: DrizzleBillingClient,
  input: { storeId?: string; subscriptionId: string; tenantId: string },
) {
  const selectedRows = await db
    .select({ addon: addons, item: subscriptionItems })
    .from(subscriptionItems)
    .innerJoin(addons, eq(addons.id, subscriptionItems.addonId))
    .where(
      and(
        eq(subscriptionItems.subscriptionId, input.subscriptionId),
        ...(input.storeId
          ? [eq(subscriptionItems.storeId, input.storeId)]
          : []),
        eq(addons.code, "crm_zapi"),
      ),
    )
    .limit(100);
  const contracts: BillingAddonContract[] = [];
  for (const selected of selectedRows) {
    if (!selected.item.storeId) continue;
    const scope = {
      storeId: selected.item.storeId,
      tenantId: input.tenantId,
    };
    const current = await findOpenContract(db, scope);
    if (current) {
      contracts.push(current);
      continue;
    }
    const [contract] = await db
      .insert(billingAddonContracts)
      .values({
        addonId: selected.addon.id,
        scheduledFor: null,
        status: "pending",
        storeId: selected.item.storeId,
        subscriptionId: input.subscriptionId,
        subscriptionItemId: selected.item.id,
        tenantId: input.tenantId,
      })
      .returning();
    if (contract) contracts.push(toContract(contract, selected.addon));
  }
  return contracts;
}
