import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmRoutingConnection } from "../../ports/crmRoutingConnectionRepository.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { retryOlxChatSetup } from "./retryOlxChatSetup.js";

describe("retryOlxChatSetup routing separation", () => {
  it("preserves provider success when automatic routing-default creation fails", async () => {
    const target = connection();
    const repository = createTestCrmConnectionRepository([target]);
    const configureChat = vi.fn(async () => ({
      httpStatus: 204,
      providerRequestId: "olx-operation-204",
    }));
    const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
    const routingConnection: CrmRoutingConnection = {
      capabilities: {
        inbound: true,
        outbound: true,
        scheduling: false,
        templates: false,
      },
      channel: "olx_chat",
      connected: true,
      credentialBroker: "direct",
      degraded: false,
      displayName: "OLX Chat",
      errorCode: null,
      id: target.id,
      provider: "olx",
      state: "active",
      storeId: target.storeId,
      tenantId: target.tenantId,
    };

    await expect(
      retryOlxChatSetup(
        createServiceContext({
          actor: { id: "user-1", kind: "user" },
          entitlements: ["crm"],
          logger,
          permissions: ["crm.messaging.connection.setup"],
          request: { requestId: "request-1" },
          storeId: "store-1",
          tenantId: "tenant-1",
        }),
        { connectionId: target.id },
        {
          crmConnectionCredentialVault: {
            open: vi.fn(async ({ sealed }) => `opened:${sealed}`),
            seal: vi.fn(),
          },
          crmConnectionRepository: repository,
          crmRepository: {} as never,
          crmRoutingConnectionRepository: {
            listConnections: vi.fn(async () => [routingConnection]),
          },
          crmRoutingPolicyRepository: {
            createDefaultIfMissing: vi.fn(async () => {
              throw new Error("routing persistence unavailable");
            }),
            listPolicies: vi.fn(async () => []),
            upsertPolicy: vi.fn(),
          },
          olxCrmCallbackOrigin: "https://api.example.test",
          olxCrmWebhookSetupProvider: {
            configureChat,
            configureLeads: vi.fn(),
          },
        },
      ),
    ).resolves.toMatchObject({
      diagnostics: { providerRequestId: "olx-operation-204" },
      readiness: { ready: true },
      setup: { status: "configured" },
    });

    expect(configureChat).toHaveBeenCalledOnce();
    expect(await repository.findConnectionById(target.id)).toMatchObject({
      metadata: { webhookSetup: { status: "configured" } },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      "crm.connection.olx.chat.setup.routing_default.failed",
      expect.objectContaining({
        connectionId: target.id,
        providerSucceeded: true,
      }),
    );
  });
});

function connection(): CrmConnection {
  const id = "olx-routing-connection";
  return {
    credentialsRef: {
      stored: { accessToken: "sealed-access", webhookSecret: "sealed-webhook" },
    },
    displayName: "OLX Chat",
    externalConnectionId: "olx-account",
    externalInstanceId: null,
    id,
    metadata: {
      webhookSetup: {
        capabilities: {
          chat: { status: "error" },
          leads: { status: "active" },
        },
        status: "partial",
      },
    },
    phone: null,
    provider: "olx_chat",
    status: "error",
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
    webhookUrl: `https://api.example.test/api/v1/crm/webhooks/olx/${id}/received`,
  };
}
