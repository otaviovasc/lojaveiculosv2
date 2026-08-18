import { describe, expect, it } from "vitest";
import { readRoutingCandidates } from "./crmRoutingTypes";

describe("readRoutingCandidates", () => {
  it("keeps canonical channel data without inferring it from the provider", () => {
    expect(
      readRoutingCandidates([
        {
          capabilities: ["inbound", "outbound"],
          channel: "instagram",
          displayName: "Instagram",
          id: "connection-1",
          isDefault: true,
          provider: "meta_cloud",
          readiness: {
            ready: true,
            reason: null,
            reasonCode: "ready",
          },
          state: "active",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        channel: "instagram",
        provider: "meta_cloud",
        state: "active",
      }),
    ]);
  });

  it("drops connections that do not satisfy the shared DTO schema", () => {
    expect(
      readRoutingCandidates([
        {
          channel: undefined,
          displayName: "OLX",
          id: "connection-1",
          provider: "olx",
        },
      ]),
    ).toEqual([]);
  });
});
