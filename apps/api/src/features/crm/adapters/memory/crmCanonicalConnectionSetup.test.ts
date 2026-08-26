import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createCrmChannelConnection } from "../../../../domains/crm/services/CrmChannelConnectionService/createCrmChannelConnection.js";
import { listCrmChannelConnections } from "../../../../domains/crm/services/CrmChannelConnectionService/crmChannelConnections.js";
import { createMemoryCrmConnectionRepository } from "./crmConnectionRepository.js";
import { createMemoryCrmRoutingRepositories } from "./crmRoutingRepository.js";

describe("canonical CRM connection setup persistence", () => {
  it("makes a fresh connected Z-API route ready, default, and inbox-selectable", async () => {
    const connectionRepository = createMemoryCrmConnectionRepository();
    const routing = createMemoryCrmRoutingRepositories();
    const getConnectionStatus = vi.fn(async () => ({
      checkedAt: new Date("2026-08-17T12:00:00.000Z"),
      connected: true,
      connectedPhone: "+5511999999999",
      providerStatus: "connected" as const,
      smartphoneConnected: true,
    }));
    const ports = {
      crmConnectionCredentialVault: {
        open: vi.fn(async ({ sealed }: { sealed: string }) =>
          sealed.replace(/^sealed:/u, ""),
        ),
        seal: vi.fn(
          async ({ plaintext }: { plaintext: string }) => `sealed:${plaintext}`,
        ),
      },
      crmConnectionRepository: connectionRepository,
      crmRepository: {} as never,
      crmRoutingConnectionRepository:
        connectionRepository.routingConnectionRepository,
      crmRoutingPolicyRepository: routing.policyRepository,
      crmMessagingGateway: {
        configureWebhooks: vi.fn(
          async (
            _connection,
            input: { webhooks: readonly { type: string; url: string }[] },
          ) => ({
            results: input.webhooks.map((webhook) => ({
              error: null,
              ok: true,
              status: 200,
              type: webhook.type,
              url: webhook.url,
              verified: true,
            })),
          }),
        ),
        getConnectionStatus,
      } as never,
      zapiConnectionSetupProvider: {
        getPairingCode: vi.fn(),
        getQrCode: vi.fn(),
        validateStatus: vi.fn(async () => ({
          connected: true,
          connectedPhone: "+5511999999999",
          smartphoneConnected: true,
        })),
      },
    };

    const created = await createCrmChannelConnection(
      context(),
      {
        channel: "whatsapp",
        clientToken: "client-secret",
        displayName: "WhatsApp principal",
        instanceId: "instance-1",
        instanceToken: "token-1",
        provider: "zapi",
        webhookSetupTarget: {
          basePath: "/api/v1/crm/whatsapp/webhooks/zapi",
          canonicalApiOrigin: "https://api.example.test",
        },
      },
      ports,
    );

    const [canonical] =
      await connectionRepository.routingConnectionRepository.listConnections({
        storeId: storeId as never,
        tenantId: tenantId as never,
      });
    const [listed] = await listCrmChannelConnections(context(), ports);
    const [policy] = await routing.policyRepository.listPolicies({
      storeId: storeId as never,
      tenantId: tenantId as never,
    });

    expect(created).toMatchObject({ ready: true, state: "active" });
    expect(canonical).toMatchObject({
      capabilities: {
        catalog: true,
        conversation_start: true,
        delete: true,
        inbound: true,
        media: true,
        outbound: true,
        reactions: true,
        scheduling: true,
        templates: false,
        text: true,
      },
      channel: "whatsapp",
      connected: true,
      id: created.id,
      provider: "zapi",
      state: "active",
    });
    expect(policy?.defaultConnectionId).toBe(created.id);
    expect(listed).toMatchObject({
      id: created.id,
      isDefault: true,
      ready: true,
    });
  });
});

const storeId = "11111111-1111-4111-8111-111111111111";
const tenantId = "22222222-2222-4222-8222-222222222222";

function context() {
  return createServiceContext({
    actor: { id: "user-1", kind: "user" },
    entitlements: ["crm"],
    permissions: ["crm.messaging.connection.setup", "crm.conversations.read"],
    request: { requestId: "canonical-setup-test" },
    storeId,
    tenantId,
  });
}
