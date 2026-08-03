import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { subscriptionItems } from "@lojaveiculosv2/db";
import { createFakeBillingAccountDb } from "../billing/drizzleBillingAccount.testSupport.js";
import { insertBillingDefaults } from "./drizzleAccountProvisioningBilling.js";

const tenant = {
  id: "tenant_1",
  legalName: "Loja LTDA",
  tradingName: "Loja",
};

const store = {
  id: "store_1",
  tenantId: "tenant_1",
};

describe("account provisioning billing defaults", () => {
  it("persists a store plan contract for quota-backed actions during trial", async () => {
    const db = createFakeBillingAccountDb({
      planFeatures: [
        {
          featureKey: "analytics",
          includedInTrial: true,
          planId: "plan_1",
        },
      ],
      plans: [
        {
          catalogVersion: "2026-07-v1",
          id: "plan_1",
          isDefault: true,
          monthlyPriceCents: 29900,
          publishedAt: new Date("2026-07-01T00:00:00.000Z"),
          status: "active",
        },
      ],
    });

    await insertBillingDefaults(
      db as never,
      tenant as never,
      store as never,
      undefined,
    );

    const planItem = db.inserted.find(
      (entry) => entry.table === subscriptionItems,
    )?.row;
    expect(planItem).toMatchObject({
      itemType: "plan",
      planId: "plan_1",
      quantity: 1,
      storeId: "store_1",
      tenantId: "tenant_1",
      unitAmountCents: 29900,
    });
    expect(planItem?.subscriptionId).toBeTruthy();
  });

  it("keeps paid items separate from the safe trial catalog", () => {
    const migration = readFileSync(
      new URL(
        "../../../../../../packages/db/drizzle/0010_billing_trial_lifecycle.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(migration).toContain("('analytics', 1, true");
    expect(migration).toContain("('custom_domain', 1, false");
    expect(migration).toContain("('plate_lookup', 1, false");
    expect(migration).toContain("interval '14 days'");
    expect(migration).toContain('SET "included_in_trial" = false');
    expect(migration).toContain('DELETE FROM "subscription_items"');
    expect(migration).toContain("'safe_trial_catalog'");

    const contractRepair = readFileSync(
      new URL(
        "../../../../../../packages/db/drizzle/0012_trial_store_plan_contract.sql",
        import.meta.url,
      ),
      "utf8",
    );
    expect(contractRepair).toContain("subscription.status = 'trialing'");
    expect(contractRepair).toContain('"item_type"');
    expect(contractRepair).toContain("'plan'");
    expect(contractRepair).toContain("NOT EXISTS");
  });

  it("selects a versioned catalog without mutating catalog tables", () => {
    const source = readFileSync(
      new URL("./drizzleAccountProvisioningBilling.ts", import.meta.url),
      "utf8",
    );
    const billingAccount = readFileSync(
      new URL("../billing/drizzleBillingAccount.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain(".insert(plans)");
    expect(source).not.toContain(".insert(planFeatures)");
    expect(source).toContain("toStorePlanContractItem");
    expect(source).toContain("catalogVersion");
    expect(source).toContain("includedInTrial");
    expect(source).toContain("../billing/drizzleBillingAccount.js");
    expect(billingAccount).toContain("addDays(now, 14)");
    expect(
      existsSync(
        new URL("../billing/drizzleBillingPlanContract.ts", import.meta.url),
      ),
    ).toBe(true);
  });

  it("marks newly provisioned trial entitlements as safe trial catalog rows", () => {
    const source = readFileSync(
      new URL("./drizzleAccountProvisioningWrites.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain('"safe_trial_catalog"');
  });

  it("publishes the paid expansion catalog with server-owned prices", () => {
    const migration = readFileSync(
      new URL(
        "../../../../../../packages/db/drizzle/0011_billing_addon_catalog.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(migration).toContain("'crm_whatsapp_instance'");
    expect(migration).toContain("'marketplace_connectors'");
    expect(migration).toContain("'fiscal_spedy'");
    expect(migration).toContain("'public_api_access'");
    expect(migration).toContain("'simulations_pro'");
    expect(migration).toContain("24999, 'CRM WhatsApp'");
    expect(migration).toContain("19990, 'Fiscal NF-e + NFS-e'");
    expect(migration).not.toContain("true,");
  });
});
