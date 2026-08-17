import { describe, expect, it } from "vitest";
import type { OlxCapabilityResult } from "../../domains/marketplace/ports/marketplaceOlxCrmOnboarding.js";
import { olxProviderConnectionMetadata } from "./runtimeOlxCrmOnboardingSupport.js";

describe("olxProviderConnectionMetadata", () => {
  it("makes only active Chat registrations ready for canonical routing", () => {
    expect(olxProviderConnectionMetadata(capability("active", null))).toEqual({
      capabilities: {
        inbound: true,
        outbound: true,
        scheduling: false,
        templates: false,
      },
      connected: true,
      degraded: false,
      errorCode: null,
      operationalStatus: { reason: null, status: "active" },
      source: "marketplace_oauth",
    });
  });

  it("keeps rejected Chat registrations blocked and diagnosable", () => {
    expect(
      olxProviderConnectionMetadata(capability("error", "provider_rejected")),
    ).toMatchObject({
      capabilities: { inbound: false, outbound: false },
      connected: false,
      degraded: true,
      errorCode: "provider_rejected",
    });
  });
});

function capability(
  status: OlxCapabilityResult["status"],
  reason: OlxCapabilityResult["reason"],
): OlxCapabilityResult {
  return {
    capability: "messaging",
    grantState: "granted",
    reason,
    status,
  };
}
