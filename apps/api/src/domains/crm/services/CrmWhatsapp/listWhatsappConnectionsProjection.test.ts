import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { projectCanonicalCrmConnectionRow } from "../../ports/crmChannelConnectionProjection.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { listWhatsappConnections } from "./listWhatsappConnections.js";

const storeId = "11111111-1111-4111-8111-111111111111";
const tenantId = "22222222-2222-4222-8222-222222222222";

describe("listWhatsappConnections canonical projection", () => {
  it("projects every channel state without provider or live-status inference", async () => {
    const connections = [
      connection("zapi", "zapi", "whatsapp", "direct", "active", {
        capabilities: { inbound: true, outbound: true, scheduling: true },
        connected: true,
        providerConnected: true,
        webhookSetup: { status: "configured" },
      }),
      connection(
        "meta",
        "composio_whatsapp",
        "whatsapp",
        "composio",
        "active",
        {
          capabilities: { inbound: true, outbound: true, templates: true },
          connected: true,
          providerConnected: true,
        },
      ),
      connection(
        "instagram",
        "composio_instagram",
        "instagram",
        "composio",
        "active",
        {
          capabilities: { inbound: true },
          connected: true,
          providerConnected: true,
        },
      ),
      connection("olx-pending", "olx_chat", "olx_chat", "direct", "sandbox", {
        capabilities: {},
        connected: false,
        errorCode: "pending_webhook",
      }),
      connection("olx-active", "olx_chat", "olx_chat", "direct", "active", {
        capabilities: { inbound: true, outbound: true },
        connected: true,
        webhookSetup: { capabilities: { chat: { status: "active" } } },
      }),
      connection(
        "olx-disconnected",
        "olx_chat",
        "olx_chat",
        "direct",
        "disconnected",
        {
          capabilities: { inbound: true },
          connected: false,
        },
      ),
      connection(
        "no-alias-inference",
        "zapi",
        "instagram",
        "composio",
        "active",
        {
          capabilities: {},
          connected: true,
          providerConnected: true,
          webhookSetup: { status: "configured" },
        },
        "meta_cloud",
      ),
    ];
    const result = await listWhatsappConnections(context(), ports(connections));
    const byId = Object.fromEntries(result.map((item) => [item.id, item]));

    expect(byId.zapi).toMatchObject({
      broker: "direct",
      capabilities: ["inbound", "outbound", "scheduling"],
      channel: "whatsapp",
      provider: "zapi",
      readiness: { ready: true, reasonCode: "ready" },
    });
    expect(byId.meta).toMatchObject({
      broker: "composio",
      capabilities: ["inbound", "outbound", "templates"],
      channel: "whatsapp",
      provider: "meta_cloud",
    });
    expect(byId.instagram).toMatchObject({
      capabilities: ["inbound"],
      channel: "instagram",
      provider: "meta_cloud",
    });
    expect(byId["olx-pending"]).toMatchObject({
      capabilities: [],
      provider: "olx",
      readiness: { ready: false, reasonCode: "pending_webhook" },
      state: "sandbox",
    });
    expect(byId["olx-active"]).toMatchObject({
      isDefault: true,
      readiness: { ready: true, reasonCode: "ready" },
    });
    expect(byId["olx-disconnected"]).toMatchObject({
      readiness: { ready: false, reasonCode: "disconnected" },
      state: "disconnected",
    });
    expect(byId["no-alias-inference"]).toMatchObject({
      broker: "composio",
      capabilities: [],
      channel: "instagram",
      provider: "meta_cloud",
      readiness: { ready: false, reasonCode: "missing_capability" },
    });
  });
});

function context() {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    entitlements: ["crm", "crm_zapi"],
    permissions: ["crm.whatsapp.list"],
    request: { requestId: "request_1" },
    storeId,
    tenantId,
  });
}

function ports(connections: readonly CrmConnection[]): CrmServicePorts {
  return {
    crmConnectionRepository: createTestCrmConnectionRepository(connections),
    crmProviderRuntime: { olxChatEnabled: true },
    crmRepository: {} as never,
    crmRoutingPolicyRepository: {
      listPolicies: vi.fn(async () => [{ defaultConnectionId: "olx-active" }]),
    } as never,
    crmWhatsappGateway: {
      getConnectionStatus: vi.fn(async () => ({
        checkedAt: new Date("2026-08-18T12:00:00.000Z"),
        connected: false,
        connectedPhone: null,
        providerStatus: "disconnected" as const,
        smartphoneConnected: null,
      })),
    } as never,
  };
}

function connection(
  id: string,
  setupProvider: CrmConnection["provider"],
  channel: "instagram" | "olx_chat" | "whatsapp",
  broker: "composio" | "direct",
  state: CrmConnection["status"],
  metadata: Record<string, unknown>,
  provider: "meta_cloud" | "olx" | "zapi" = setupProvider === "zapi"
    ? "zapi"
    : setupProvider === "olx_chat"
      ? "olx"
      : "meta_cloud",
): CrmConnection {
  return {
    canonical: projectCanonicalCrmConnectionRow({
      broker,
      channel,
      metadata,
      provider,
      state,
    }),
    credentialsRef: {},
    displayName: id,
    externalConnectionId: null,
    externalInstanceId: null,
    id,
    metadata,
    phone: null,
    provider: setupProvider,
    status: state,
    storeId: storeId as never,
    tenantId: tenantId as never,
    webhookUrl: null,
  };
}
