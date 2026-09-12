import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import {
  createContext,
  storeId,
  tenantId,
} from "../testSupportCrmChannelConnectionCreation.js";
import { assertProviderEffectAllowed } from "./assertProviderEffectAllowed.js";
import { sendOutboundMessage } from "./sendOutboundMessage.js";

describe("assertProviderEffectAllowed", () => {
  it("blocks OLX provider effects while Chat setup is pending", () => {
    expect(() =>
      assertProviderEffectAllowed(createContext(), olxConnection("blocked"), {
        olxChatEnabled: true,
      }),
    ).toThrow("OLX Chat setup is not active");
  });

  it("allows OLX provider effects only after Chat setup is active", () => {
    expect(() =>
      assertProviderEffectAllowed(createContext(), olxConnection("active"), {
        olxChatEnabled: true,
      }),
    ).not.toThrow();
  });

  it("blocks outbound provider effects after the CRM entitlement is removed", async () => {
    await expect(
      sendOutboundMessage(
        createContext(["crm.messaging.send"], []),
        {} as never,
        {} as never,
      ),
    ).rejects.toThrow("Missing entitlement: crm");
  });
});

function olxConnection(status: "active" | "blocked"): CrmConnection {
  return {
    broker: "direct",
    channel: "olx_chat",
    credentialsRef: {},
    displayName: "OLX",
    externalConnectionId: "olx_1",
    externalInstanceId: null,
    id: "connection_1",
    metadata: { webhookSetup: { capabilities: { chat: { status } } } },
    phone: null,
    provider: "olx",
    status: "active",
    storeId: storeId as never,
    tenantId: tenantId as never,
    webhookUrl: null,
  };
}
