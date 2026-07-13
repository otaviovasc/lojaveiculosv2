import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("account provisioning billing defaults", () => {
  it("publishes CRM once, as a trial-enabled recurring add-on", () => {
    const migration = readFileSync(
      new URL(
        "../../../../../../packages/db/drizzle/0006_billing_catalog_v1.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(migration).toContain("'automation', 1");
    expect(migration).toContain('DELETE FROM "plan_features"');
    expect(migration).toContain("\"feature_key\" = 'crm'");
    expect(migration).toContain(
      "'crm_whatsapp_instance', '2026-07-v1', 'crm', true",
    );
  });

  it("selects a versioned catalog without mutating catalog tables", () => {
    const source = readFileSync(
      new URL("./drizzleAccountProvisioningBilling.ts", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain(".insert(plans)");
    expect(source).not.toContain(".insert(planFeatures)");
    expect(source).toContain("catalogVersion");
  });
});
