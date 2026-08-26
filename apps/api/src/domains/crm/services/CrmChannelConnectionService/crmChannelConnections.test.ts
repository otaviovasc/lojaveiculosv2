import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import type { UpsertCrmChannelRoutingPolicyInput } from "../../ports/crmRoutingPolicyRepository.js";
import { crmChannelConnectionCapabilityFacts } from "../../channelConnections/connectionCreation.js";
import {
  createZapiWebhookSetupIntent,
  withZapiWebhookSetupState,
} from "../../whatsapp/zapiWebhookSetupState.js";
import {
  getCrmChannelConnectionOverview,
  updateCrmChannelConnection,
} from "./crmChannelConnections.js";

const storeId = "11111111-1111-4111-8111-111111111111";
const tenantId = "22222222-2222-4222-8222-222222222222";

describe("getCrmChannelConnectionOverview", () => {
  it("renders connection setup from CRM state alone", async () => {
    const overview = await getCrmChannelConnectionOverview(
      createContext(["crm"]),
      createPorts(),
    );

    expect(overview.allowance).toEqual({ limit: 1, remaining: 1, used: 0 });
  });

  it("keeps Z-API discoverable without an add-on capacity", async () => {
    const overview = await getCrmChannelConnectionOverview(
      createContext(["crm"]),
      createPorts(),
    );

    expect(overview.allowance).toEqual({ limit: 1, remaining: 1, used: 0 });
    expect(overview.availableSetups).toEqual([
      { broker: "direct", channel: "whatsapp", provider: "zapi" },
      { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
      { broker: "composio", channel: "instagram", provider: "meta_cloud" },
    ]);
  });

  it("keeps Z-API discoverable without entitlement or capacity", async () => {
    const withoutCapacity = await getCrmChannelConnectionOverview(
      createContext(["crm"]),
      createPorts(),
    );
    const withoutEntitlement = await getCrmChannelConnectionOverview(
      createContext(["crm"]),
      createPorts(),
    );

    expect(withoutCapacity.availableSetups).toEqual([
      { broker: "direct", channel: "whatsapp", provider: "zapi" },
      { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
      { broker: "composio", channel: "instagram", provider: "meta_cloud" },
    ]);
    expect(withoutEntitlement.availableSetups).toEqual([
      { broker: "direct", channel: "whatsapp", provider: "zapi" },
      { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
      { broker: "composio", channel: "instagram", provider: "meta_cloud" },
    ]);
  });
});

describe("updateCrmChannelConnection", () => {
  it("does not initialize routing for an unrelated display-name update", async () => {
    const connectionId = "33333333-3333-4333-8333-333333333333";
    const repository = createTestCrmConnectionRepository([
      {
        broker: "direct",
        channel: "whatsapp",
        credentialsRef: {
          mode: "stored",
          stored: {
            clientToken: "sealed:client-token",
            instanceId: "sealed:instance-id",
            instanceToken: "sealed:instance-token",
          },
        },
        displayName: "WhatsApp",
        externalConnectionId: null,
        externalInstanceId: null,
        id: connectionId,
        metadata: withZapiWebhookSetupState(
          {
            capabilities: crmChannelConnectionCapabilityFacts({
              broker: "direct",
              channel: "whatsapp",
              provider: "zapi",
            }),
            connected: true,
            degraded: false,
            errorCode: null,
          },
          {
            ...createZapiWebhookSetupIntent(connectionId),
            configuredAt: "2026-08-23T12:00:00.000Z",
            status: "configured",
          },
        ),
        phone: null,
        provider: "zapi",
        status: "active",
        storeId: storeId as never,
        tenantId: tenantId as never,
        webhookUrl: null,
      },
    ]);
    const createDefaultIfMissing = vi.fn(
      async (input: UpsertCrmChannelRoutingPolicyInput) => ({
        ...input,
        id: "policy-whatsapp",
      }),
    );

    const updated = await updateCrmChannelConnection(
      createServiceContext({
        actor: { id: "user_1", kind: "user" },
        entitlements: ["crm"],
        permissions: ["crm.messaging.connection.setup"],
        request: { requestId: "request_1" },
        storeId,
        tenantId,
      }),
      { connectionId, displayName: "WhatsApp principal" },
      {
        crmConnectionRepository: repository,
        crmMessagingGateway: {
          configureWebhooks: vi.fn(),
          deleteMessage: vi.fn(),
          disconnectConnection: vi.fn(),
          getConnectionStatus: vi.fn(async () => ({
            checkedAt: new Date("2026-08-23T12:00:00.000Z"),
            connected: true,
            connectedPhone: null,
            providerStatus: "connected" as const,
            smartphoneConnected: true,
          })),
          getProfilePhotoUrl: vi.fn(),
          listCatalogProducts: vi.fn(),
          removeReaction: vi.fn(),
          sendCatalog: vi.fn(),
          sendMedia: vi.fn(),
          sendProduct: vi.fn(),
          sendReaction: vi.fn(),
          sendTemplate: vi.fn(),
          sendText: vi.fn(),
        },
        crmRepository: {} as never,
        crmRoutingConnectionRepository: repository.routingConnectionRepository,
        crmRoutingPolicyRepository: {
          createDefaultIfMissing,
          listPolicies: vi.fn(async () => []),
          upsertPolicy: vi.fn(),
        },
      },
    );

    expect(updated.ready).toBe(true);
    expect(createDefaultIfMissing).not.toHaveBeenCalled();
  });
});

function createContext(entitlements: "crm"[]) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    entitlements,
    permissions: ["crm.conversations.read"],
    request: { requestId: "request_1" },
    storeId,
    tenantId,
  });
}

function createPorts(): CrmServicePorts {
  return {
    crmConnectionRepository: createTestCrmConnectionRepository(),
    crmRepository: {} as never,
  };
}
