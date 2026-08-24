import { describe, expect, it } from "vitest";
import { subscriptionItems, subscriptions } from "@lojaveiculosv2/db";
import { BillingSelectionError } from "../../../domains/billing/services/BillingService/updateBillingSelection.js";
import { updateStoreSubscriptionSelection } from "./drizzleBillingSelection.js";
import { createFakeBillingAccountDb } from "./drizzleBillingAccount.testSupport.js";

const plan = {
  catalogVersion: "2026-07-v1",
  id: "plan_1",
  monthlyPriceCents: 29900,
  status: "active",
};

const input = {
  addonIds: [],
  planId: "plan_1",
  storeId: "store_1",
  tenantId: "tenant_1",
} as const;

describe("updateStoreSubscriptionSelection", () => {
  it("creates the missing billing account before applying the selection", async () => {
    const db = createFakeBillingAccountDb({
      plans: [plan],
      tenants: [
        { id: "tenant_1", legalName: "Loja LTDA", tradingName: "Loja" },
      ],
    });

    await updateStoreSubscriptionSelection(db, input as never);

    const subscription = db.inserted.find(
      (entry) => entry.table === subscriptions,
    )?.row;
    expect(subscription).toMatchObject({
      provider: "asaas",
      status: "trialing",
      tenantId: "tenant_1",
    });
    const planItem = db.inserted.find(
      (entry) => entry.table === subscriptionItems,
    )?.row;
    expect(planItem).toMatchObject({
      itemType: "plan",
      planId: "plan_1",
      storeId: "store_1",
      subscriptionId: subscription?.id,
      tenantId: "tenant_1",
      unitAmountCents: 29900,
    });
  });

  it("reuses the existing subscription when one exists", async () => {
    const db = createFakeBillingAccountDb({
      plans: [plan],
      subscriptions: [
        { id: "subscription_1", status: "trialing", tenantId: "tenant_1" },
      ],
    });

    await updateStoreSubscriptionSelection(db, input as never);

    expect(db.inserted.some((entry) => entry.table === subscriptions)).toBe(
      false,
    );
    expect(
      db.inserted.find((entry) => entry.table === subscriptionItems)?.row,
    ).toMatchObject({ planId: "plan_1", subscriptionId: "subscription_1" });
  });

  it("surfaces an unknown plan as a billing selection error", async () => {
    const db = createFakeBillingAccountDb({
      subscriptions: [
        { id: "subscription_1", status: "trialing", tenantId: "tenant_1" },
      ],
    });

    await expect(
      updateStoreSubscriptionSelection(db, input as never),
    ).rejects.toBeInstanceOf(BillingSelectionError);
  });

  it("surfaces an unknown add-on as a billing selection error", async () => {
    const db = createFakeBillingAccountDb({
      plans: [plan],
      subscriptions: [
        { id: "subscription_1", status: "trialing", tenantId: "tenant_1" },
      ],
    });

    await expect(
      updateStoreSubscriptionSelection(db, {
        ...input,
        addonIds: ["addon_unknown"],
      } as never),
    ).rejects.toBeInstanceOf(BillingSelectionError);
  });

  it("promotes a legacy global plan when the tenant has one store", async () => {
    const db = createFakeBillingAccountDb({
      plans: [plan],
      stores: [{ id: "store_1", isDeleted: false, tenantId: "tenant_1" }],
      subscriptionItems: [
        {
          id: "global_plan_item",
          itemType: "plan",
          planId: "plan_1",
          storeId: null,
          subscriptionId: "subscription_1",
          tenantId: "tenant_1",
        },
      ],
      subscriptions: [
        { id: "subscription_1", status: "active", tenantId: "tenant_1" },
      ],
    });

    await updateStoreSubscriptionSelection(db, input as never);

    expect(
      db.inserted.filter((entry) => entry.table === subscriptionItems),
    ).toHaveLength(0);
    expect(
      db.inserted.find((entry) => entry.table === subscriptionItems),
    ).toBeUndefined();
  });

  it("does not silently duplicate a global plan across multiple stores", async () => {
    const db = createFakeBillingAccountDb({
      plans: [plan],
      stores: [
        { id: "store_1", isDeleted: false, tenantId: "tenant_1" },
        { id: "store_2", isDeleted: false, tenantId: "tenant_1" },
      ],
      subscriptionItems: [
        {
          id: "global_plan_item",
          itemType: "plan",
          planId: "plan_1",
          storeId: null,
          subscriptionId: "subscription_1",
          tenantId: "tenant_1",
        },
      ],
      subscriptions: [
        { id: "subscription_1", status: "active", tenantId: "tenant_1" },
      ],
    });

    await expect(
      updateStoreSubscriptionSelection(db, input as never),
    ).rejects.toThrow("needs store allocation");
  });

  it("rejects ambiguous legacy billing allocations", async () => {
    const db = createFakeBillingAccountDb({
      plans: [plan],
      stores: [{ id: "store_1", isDeleted: false, tenantId: "tenant_1" }],
      subscriptionItems: [
        {
          id: "global_plan_item_1",
          itemType: "plan",
          planId: "plan_1",
          storeId: null,
          subscriptionId: "subscription_1",
          tenantId: "tenant_1",
        },
        {
          id: "global_plan_item_2",
          itemType: "plan",
          planId: "plan_1",
          storeId: null,
          subscriptionId: "subscription_1",
          tenantId: "tenant_1",
        },
      ],
      subscriptions: [
        { id: "subscription_1", status: "active", tenantId: "tenant_1" },
      ],
    });

    await expect(
      updateStoreSubscriptionSelection(db, input as never),
    ).rejects.toThrow("multiple unallocated plans");
  });
});
