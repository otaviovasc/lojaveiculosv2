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

    await expect(ensureTenantBillingAccount(db, "tenant_1")).rejects.toThrow(
      "Billing tenant was not found.",
    );
  });

  it("creates the customer and a trialing subscription under a lock", async () => {
    const db = createFakeBillingAccountDb({ tenants: [tenant] });

    const account = await ensureTenantBillingAccount(db, "tenant_1");

    expect(db.executeCalls).toHaveLength(1);
    expect(account.customer.providerCustomerId).toBe(
      "local_asaas_customer_tenant_1",
    );
    expect(account.subscription.status).toBe("trialing");
    expect(account.subscription.billingCustomerId).toBe(account.customer.id);
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

  it("creates a local asaas customer with the profile contacts", async () => {
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
      providerCustomerId: "local_asaas_customer_tenant_1",
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

    const subscription = await ensureSubscription(db, "tenant_1", "customer_1");

    expect(subscription).toBe(existing);
    expect(db.inserted.some((entry) => entry.table === subscriptions)).toBe(
      false,
    );
  });

  it("creates a 14-day trialing subscription when none exists", async () => {
    const db = createFakeBillingAccountDb();

    const subscription = await ensureSubscription(db, "tenant_1", "customer_1");

    const start = subscription.currentPeriodStart as Date;
    const end = subscription.currentPeriodEnd as Date;
    expect(subscription.status).toBe("trialing");
    expect(subscription.provider).toBe("asaas");
    expect(subscription.providerSubscriptionId).toBe(
      "local_asaas_subscription_tenant_1",
    );
    expect(end.getTime() - start.getTime()).toBe(14 * 24 * 60 * 60 * 1000);
  });
});
