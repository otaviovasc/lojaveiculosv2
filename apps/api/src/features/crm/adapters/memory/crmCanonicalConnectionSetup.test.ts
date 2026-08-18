import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createWhatsappConnection } from "../../../../domains/crm/services/CrmWhatsapp/createWhatsappConnection.js";
import { listWhatsappConnections } from "../../../../domains/crm/services/CrmWhatsapp/listWhatsappConnections.js";
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
      billingQuotaGuard: {
        assertAvailable: vi.fn(async () => undefined),
        getAllowance: vi.fn(async () => ({ limit: 1, remaining: 0, used: 1 })),
      },
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
      crmWhatsappGateway: {
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

    const created = await createWhatsappConnection(
      context(),
      {
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
    const [listed] = await listWhatsappConnections(context(), ports);
    const [policy] = await routing.policyRepository.listPolicies({
      storeId: storeId as never,
      tenantId: tenantId as never,
    });

    expect(created).toMatchObject({ ready: true, state: "active" });
    expect(canonical).toMatchObject({
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
    entitlements: ["crm", "crm_zapi"],
    permissions: ["crm.messaging.connection.setup", "crm.whatsapp.list"],
    request: { requestId: "canonical-setup-test" },
    storeId,
    tenantId,
  });
}
