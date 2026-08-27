import { describe, expect, it } from "vitest";
import { billingCustomers, subscriptions } from "@lojaveiculosv2/db";
import {
  ensureBillingCustomer,
  ensureSubscription,
  ensureTenantBillingAccount,
} from "./drizzleBillingAccount.js";
import { createFakeBillingAccountDb } from "./drizzleBillingAccount.testSupport.js";

const tenant = {
  id: "tenant_1",
  legalName: "Loja LTDA",
  tradingName: "Loja",
};

describe("ensureTenantBillingAccount", () => {
  it("fails when the tenant does not exist", async () => {
    const db = createFakeBillingAccountDb();

    await expect(
      ensureTenantBillingAccount(db, "tenant_1", "store_1"),
    ).rejects.toThrow("Billing tenant was not found.");
  });

  it("creates an active open-ended billing account under a lock", async () => {
    const db = createFakeBillingAccountDb({ tenants: [tenant] });

    const account = await ensureTenantBillingAccount(db, "tenant_1", "store_1");

    expect(db.executeCalls).toHaveLength(1);
    expect(account.customer.providerCustomerId).toBeNull();
    expect(account.subscription.status).toBe("active");
    expect(account.subscription.currentPeriodEnd).toBeNull();
    expect(account.subscription.providerSubscriptionId).toBeNull();
    expect(account.subscription.billingCustomerId).toBe(account.customer.id);
    expect(account.subscription.storeId).toBe("store_1");
  });
});

describe("ensureBillingCustomer", () => {
  it("reuses the existing customer and refreshes the tenant name", async () => {
    const db = createFakeBillingAccountDb({
      billingCustomers: [
        {
          id: "customer_1",
          name: "Nome antigo",
          provider: "asaas",
          tenantId: "tenant_1",
        },
      ],
    });

    const customer = await ensureBillingCustomer(
      db,
      tenant as never,
      undefined,
    );

    expect(customer.id).toBe("customer_1");
    expect(customer.name).toBe("Loja LTDA");
    expect(db.inserted.some((entry) => entry.table === billingCustomers)).toBe(
      false,
    );
  });

  it("creates an unbound Asaas customer with the profile contacts", async () => {
    const db = createFakeBillingAccountDb();

    const customer = await ensureBillingCustomer(db, tenant as never, {
      contactEmail: "contato@loja.com.br",
      documentNumber: "12345678000199",
    });

    expect(customer).toMatchObject({
      documentNumber: "12345678000199",
      email: "contato@loja.com.br",
      name: "Loja LTDA",
      provider: "asaas",
      providerCustomerId: null,
      tenantId: "tenant_1",
    });
  });
});

describe("ensureSubscription", () => {
  it("returns the latest existing subscription without inserting", async () => {
    const existing = {
      id: "subscription_1",
      status: "active",
      tenantId: "tenant_1",
    };
    const db = createFakeBillingAccountDb({ subscriptions: [existing] });

    const subscription = await ensureSubscription(
      db,
      "tenant_1",
      "store_1",
      "customer_1",
    );

    expect(subscription).toBe(existing);
    expect(db.inserted.some((entry) => entry.table === subscriptions)).toBe(
      false,
    );
  });

  it("creates an active open-ended subscription without provider placeholders", async () => {
    const db = createFakeBillingAccountDb();

    const subscription = await ensureSubscription(
      db,
      "tenant_1",
      "store_1",
      "customer_1",
    );

    expect(subscription.currentPeriodStart).toBeInstanceOf(Date);
    expect(subscription.currentPeriodEnd).toBeNull();
    expect(subscription.status).toBe("active");
    expect(subscription.provider).toBe("asaas");
    expect(subscription.providerSubscriptionId).toBeNull();
    expect(subscription.storeId).toBe("store_1");
  });
});
