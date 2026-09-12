import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const scriptUrl = new URL(
  "./backfill-missing-billing-accounts.mjs",
  import.meta.url,
);
const smokeUrl = new URL(
  "../qa/asaas-billing-webhook-smoke.mjs",
  import.meta.url,
);

describe("billing account backfill policy", () => {
  it("provisions permanent Free without synthetic provider identities", async () => {
    const source = await readFile(scriptUrl, "utf8");

    expect(source).toContain("catalog_version = '2026-08-v3'");
    expect(source).toContain("free_plan.code = 'free'");
    expect(source).toContain("provider_subscription_id, status, tenant_id");
    expect(source).toContain("null, 'active'");
    expect(source).toContain("INSERT INTO store_entitlements");
    expect(source).not.toContain("local_asaas_");
    expect(source).not.toContain("'trialing'");
    expect(source).not.toContain("interval '14 days'");
  });
});

describe("Asaas webhook smoke policy", () => {
  it("requires verified provider evidence instead of local placeholders", async () => {
    const source = await readFile(smokeUrl, "utf8");

    expect(source).toContain("Verified Asaas customer");
    expect(source).toContain("billing_plan_hires");
    expect(source).not.toContain("local_asaas_");
    expect(source).not.toContain("lojaveiculos:manual-smoke");
  });
});
