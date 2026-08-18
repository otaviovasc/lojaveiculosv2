import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import { retryOlxChatSetup } from "./retryOlxChatSetup.js";

describe("retryOlxChatSetup authorization", () => {
  it("asserts CRM entitlement before repository, lease, vault, or provider IO", async () => {
    const listConnections = vi.fn(async () => []);
    const claimOlxWebhookSetup = vi.fn();
    const open = vi.fn();
    const configureChat = vi.fn();

    await expect(
      retryOlxChatSetup(
        createServiceContext({
          actor: { id: "user_1", kind: "user" },
          entitlements: [],
          permissions: ["crm.messaging.connection.setup"],
          request: { requestId: "request_1" },
          storeId: "store_1",
          tenantId: "tenant_1",
        }),
        { connectionId: "connection_1" },
        {
          crmConnectionCredentialVault: { open, seal: vi.fn() },
          crmConnectionRepository: {
            ...createTestCrmConnectionRepository(),
            claimOlxWebhookSetup,
            listConnections,
          },
          crmRepository: {} as never,
          olxCrmCallbackOrigin: "https://api.example.test",
          olxCrmWebhookSetupProvider: {
            configureChat,
            configureLeads: vi.fn(),
          },
        },
      ),
    ).rejects.toThrow("Missing entitlement: crm");

    expect(listConnections).not.toHaveBeenCalled();
    expect(claimOlxWebhookSetup).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(configureChat).not.toHaveBeenCalled();
  });
});
