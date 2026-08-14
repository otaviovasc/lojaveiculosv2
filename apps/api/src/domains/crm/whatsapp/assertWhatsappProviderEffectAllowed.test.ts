import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import {
  createContext,
  storeId,
  tenantId,
} from "../testSupportWhatsappConnectionCreation.js";
import { assertWhatsappProviderEffectAllowed } from "./assertWhatsappProviderEffectAllowed.js";
import { sendWhatsappOutboundMessage } from "./sendWhatsappOutboundMessage.js";

describe("assertWhatsappProviderEffectAllowed", () => {
  it("blocks OLX provider effects while Chat setup is pending", () => {
    expect(() =>
      assertWhatsappProviderEffectAllowed(
        createContext(),
        olxConnection("blocked"),
        {
          olxChatEnabled: true,
        },
      ),
    ).toThrow("OLX Chat setup is not active");
  });

  it("allows OLX provider effects only after Chat setup is active", () => {
    expect(() =>
      assertWhatsappProviderEffectAllowed(
        createContext(),
        olxConnection("active"),
        {
          olxChatEnabled: true,
        },
      ),
    ).not.toThrow();
  });

  it("blocks outbound provider effects after the CRM entitlement is removed", async () => {
    await expect(
      sendWhatsappOutboundMessage(
        createContext(["crm.messaging.send"], []),
        {} as never,
        {} as never,
      ),
    ).rejects.toThrow("Missing entitlement: crm");
  });
});

function olxConnection(status: "active" | "blocked"): CrmConnection {
  return {
    credentialsRef: {},
    displayName: "OLX",
    externalConnectionId: "olx_1",
    externalInstanceId: null,
    id: "connection_1",
    metadata: { webhookSetup: { capabilities: { chat: { status } } } },
    phone: null,
    provider: "olx_chat",
    status: "active",
    storeId: storeId as never,
    tenantId: tenantId as never,
    webhookUrl: null,
  };
}
