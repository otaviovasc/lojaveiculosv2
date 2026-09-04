import { describe, expect, it } from "vitest";
import {
  crmExternalBotRouteModes,
  crmRoutingBlockedReasonCodes,
  crmRoutingPolicyPatchSchema,
  crmRoutingPolicyReadSchema,
} from "./crmRoutingContracts.js";

const connectionId = "11111111-1111-4111-8111-111111111111";

function readyRoute() {
  return {
    blocked: null,
    connection: {
      active: true,
      capabilities: ["inbound", "outbound"],
      channel: "whatsapp",
      connected: true,
      displayName: "WhatsApp principal",
      id: connectionId,
      isDefault: true,
      provider: "zapi",
      readiness: { ready: true, reason: null, reasonCode: "ready" },
      state: "active",
    },
    ready: true,
    requiredCapabilities: ["outbound"],
  } as const;
}

describe("CRM routing HTTP contracts", () => {
  it("keeps route and policy modes as separate vocabularies", () => {
    expect(crmExternalBotRouteModes).toEqual([
      "disabled",
      "inherit_store_default",
      "explicit_connection",
    ]);
    expect(crmExternalBotRouteModes).not.toContain("auto");
  });

  it("publishes stable blocked reason codes", () => {
    expect(crmRoutingBlockedReasonCodes).toEqual([
      "capability_unsupported",
      "channel_incompatible",
      "connection_inactive",
      "connection_not_connected",
      "connection_not_found",
      "policy_not_configured",
      "route_disabled",
      "scope_mismatch",
    ]);
  });

  it("parses the strict routing read model with canonical connections", () => {
    const route = readyRoute();
    const input = {
      channels: [
        {
          channel: "whatsapp",
          externalBot: { ...route, mode: "inherit_store_default" },
          storeDefault: route,
        },
      ],
      storeId: "store_1",
      tenantId: "tenant_1",
    };

    expect(crmRoutingPolicyReadSchema.parse(input)).toEqual(input);
    expect(
      crmRoutingPolicyReadSchema.safeParse({ ...input, legacyMode: "auto" })
        .success,
    ).toBe(false);
    expect(
      crmRoutingPolicyReadSchema.safeParse({
        ...input,
        channels: [
          {
            ...input.channels[0],
            externalBot: { ...input.channels[0]?.externalBot, mode: "auto" },
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("requires an explicit connection only in explicit route mode", () => {
    const base = {
      channel: "whatsapp",
      defaultConnectionId: connectionId,
      externalBotConnectionId: null,
    } as const;

    expect(
      crmRoutingPolicyPatchSchema.safeParse({
        ...base,
        externalBotMode: "inherit_store_default",
      }).success,
    ).toBe(true);
    expect(
      crmRoutingPolicyPatchSchema.safeParse({
        ...base,
        externalBotMode: "explicit_connection",
      }).success,
    ).toBe(false);
    expect(
      crmRoutingPolicyPatchSchema.safeParse({
        ...base,
        externalBotConnectionId: connectionId,
        externalBotMode: "disabled",
      }).success,
    ).toBe(false);
  });
});
