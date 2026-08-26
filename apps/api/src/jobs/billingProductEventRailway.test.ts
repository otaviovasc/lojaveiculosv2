import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("billing product-event Railway worker", () => {
  it("runs from a terminating recurring service with preserved sink settings", () => {
    const railway = readFileSync(
      new URL("../../../../.railway/railway.ts", import.meta.url),
      "utf8",
    );
    const start = railway.indexOf("const billingProductEventWorker = service(");
    const end = railway.indexOf("const crmRetentionWorker = service(", start);
    const worker = railway.slice(start, end);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(worker).toContain("deploy: {");
    expect(worker).toContain('cronSchedule: "*/5 * * * *"');
    expect(worker).toContain('restartPolicyType: "NEVER"');
    expect(worker).toContain(
      'start: "pnpm --filter @lojaveiculosv2/api billing:product-events:process"',
    );
    expect(worker).toContain("DATABASE_URL: productDatabase.env.DATABASE_URL");
    expect(worker).toContain("BILLING_PRODUCT_EVENT_SINK_TOKEN: preserve()");
    expect(worker).toContain("BILLING_PRODUCT_EVENT_SINK_URL: preserve()");
    expect(railway).toContain("billingProductEventWorker,");
  });
});
