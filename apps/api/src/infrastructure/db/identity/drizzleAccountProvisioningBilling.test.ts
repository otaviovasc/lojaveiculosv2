import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("account provisioning billing defaults", () => {
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
  });

  it("selects a versioned catalog without mutating catalog tables", () => {
    const source = readFileSync(
      new URL("./drizzleAccountProvisioningBilling.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain(".insert(plans)");
    expect(source).not.toContain(".insert(planFeatures)");
    expect(source).not.toContain("ensureStorePlanItem");
    expect(source).not.toContain("ensureStoreAddonItem");
    expect(source).toContain("catalogVersion");
    expect(source).toContain("includedInTrial");
    expect(source).toContain("addDays(new Date(), 14)");
  });
});
