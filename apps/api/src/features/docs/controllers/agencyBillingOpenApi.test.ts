import { describe, expect, it } from "vitest";
import { agencyBillingPaths } from "./agencyBillingOpenApi.js";

describe("agency billing OpenAPI", () => {
  it("keeps quote requests public to authorized agency managers", () => {
    expect(
      agencyBillingPaths[
        "/api/v1/agency/tenants/{tenantId}/stores/{storeId}/billing/plan-quotes"
      ].post.operationId,
    ).toBe("requestAgencyBillingPlanQuote");
  });

  it("publishes quote approval only as a platform-admin operation", () => {
    const operation =
      agencyBillingPaths[
        "/api/v1/agency/platform/tenants/{tenantId}/stores/{storeId}/billing/plan-quotes/{quoteId}/approve"
      ].patch;

    expect(operation.operationId).toBe("approvePlatformBillingPlanQuote");
    expect(operation.security).toEqual([
      { bearerAuth: ["platformAdmin", "billing.manage"] },
    ]);
    expect(
      "/api/v1/agency/tenants/{tenantId}/stores/{storeId}/billing/plan-quotes/{quoteId}/approve" in
        agencyBillingPaths,
    ).toBe(false);
  });
});
