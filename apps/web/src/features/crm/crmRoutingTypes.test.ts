import { describe, expect, it } from "vitest";
import {
  normalizeCrmRoutingPolicy,
  readRoutingCandidates,
} from "./crmRoutingTypes";

describe("normalizeCrmRoutingPolicy", () => {
  it.each([undefined, "invalid"])(
    "blocks a route whose nested connection channel is %s",
    (nestedChannel) => {
      const policy = normalizeCrmRoutingPolicy({
        channels: [
          {
            bot: { mode: "disabled", ready: false },
            channel: "olx_chat",
            storeDefault: {
              connection: {
                active: true,
                capabilities: ["inbound", "outbound"],
                channel: nestedChannel,
                connected: true,
                displayName: "OLX",
                id: "connection-1",
                isDefault: true,
                provider: "olx",
                readiness: {
                  ready: true,
                  reason: null,
                  reasonCode: "ready",
                },
                state: "active",
              },
              ready: true,
            },
          },
        ],
        storeId: "store-1",
        tenantId: "tenant-1",
      });

      expect(policy.channels[0]?.storeDefault).toMatchObject({
        blocked: { code: "channel_incompatible" },
        connection: null,
        ready: false,
      });
      expect(readRoutingCandidates([], policy)).toEqual([]);
    },
  );

  it("keeps a canonical nested channel without inferring from its provider", () => {
    const policy = normalizeCrmRoutingPolicy({
      channels: [
        {
          bot: { mode: "disabled", ready: false },
          channel: "instagram",
          storeDefault: {
            connection: {
              active: true,
              capabilities: ["inbound", "outbound"],
              channel: "instagram",
              connected: true,
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
            ready: true,
          },
        },
      ],
    });

    expect(policy.channels[0]?.storeDefault.connection?.channel).toBe(
      "instagram",
    );
    expect(policy.channels[0]?.storeDefault.connection?.provider).toBe(
      "meta_cloud",
    );
    expect(readRoutingCandidates([], policy)[0]).toMatchObject({
      provider: "meta_cloud",
      state: "active",
    });
  });
});
