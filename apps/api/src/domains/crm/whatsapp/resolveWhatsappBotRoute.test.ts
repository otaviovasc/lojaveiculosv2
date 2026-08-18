import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type {
  CrmRoutingConnection,
  CrmRoutingConnectionRepository,
} from "../ports/crmRoutingConnectionRepository.js";
import type {
  CrmChannelRoutingPolicy,
  CrmRoutingPolicyRepository,
} from "../ports/crmRoutingPolicyRepository.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import { WhatsappBotActionError } from "../services/CrmWhatsapp/whatsappBotIntegration.js";
import { createTestCrmConnectionRepository } from "../testSupportConnections.js";
import {
  assertWhatsappBotSessionRoute,
  resolveWhatsappBotRoute,
} from "./resolveWhatsappBotRoute.js";

describe("resolveWhatsappBotRoute", () => {
  it("uses the inherited channel default without a client connection id", async () => {
    const connection = readyZapi("default-connection");
    await expect(
      resolveWhatsappBotRoute(
        context(),
        { channel: "whatsapp", requiredCapabilities: ["outbound"] },
        ports([connection], policy({ defaultConnectionId: connection.id })),
      ),
    ).resolves.toMatchObject({ id: connection.id });
  });

  it("uses the server-owned explicit bot connection", async () => {
    const storeDefault = readyZapi("default-connection");
    const botConnection = readyZapi("bot-connection");
    await expect(
      resolveWhatsappBotRoute(
        context(),
        { channel: "whatsapp", requiredCapabilities: ["outbound"] },
        ports(
          [storeDefault, botConnection],
          policy({
            botConnectionId: botConnection.id,
            botMode: "explicit_connection",
            defaultConnectionId: storeDefault.id,
          }),
        ),
      ),
    ).resolves.toMatchObject({ id: botConnection.id });
  });

  it("rejects a client-selected connection that differs from the bot route", async () => {
    const connection = readyZapi("bot-connection");
    await expect(
      resolveWhatsappBotRoute(
        context(),
        {
          channel: "whatsapp",
          requestedConnectionId: "arbitrary-connection",
          requiredCapabilities: ["outbound"],
        },
        ports([connection], policy({ defaultConnectionId: connection.id })),
      ),
    ).rejects.toMatchObject({ code: "CRM_WHATSAPP_BOT_ROUTE_MISMATCH" });
  });

  it("fails closed instead of selecting the first connected account", async () => {
    const connection = readyZapi("connected-but-not-configured-as-route");
    await expect(
      resolveWhatsappBotRoute(
        context(),
        { channel: "whatsapp", requiredCapabilities: ["outbound"] },
        ports([connection], null),
      ),
    ).rejects.toMatchObject({ code: "CRM_WHATSAPP_BOT_ROUTE_UNAVAILABLE" });
  });

  it("returns actionable readiness failures without provider fallback", async () => {
    const connection = {
      ...readyZapi("inactive-route"),
      status: "paused",
    } as const;
    const error = await captureError(() =>
      resolveWhatsappBotRoute(
        context(),
        { channel: "whatsapp", requiredCapabilities: ["outbound"] },
        ports([connection], policy({ defaultConnectionId: connection.id })),
      ),
    );
    expect(error.code).toBe("CRM_WHATSAPP_BOT_ROUTE_UNAVAILABLE");
    expect(error.message).toContain("Reconnect or activate");
  });

  it("uses canonical provider facts without legacy identity verification", async () => {
    const connection = readyZapi("route-connection");
    const canonical = {
      ...canonicalConnection(connection),
      credentialBroker: "composio",
      provider: "meta_cloud",
    } as const;
    await expect(
      resolveWhatsappBotRoute(
        context(),
        { channel: "whatsapp", requiredCapabilities: ["outbound"] },
        ports([connection], policy({ defaultConnectionId: connection.id }), [
          canonical,
        ]),
      ),
    ).resolves.toMatchObject({
      id: connection.id,
      provider: "composio_whatsapp",
    });
  });

  it("keeps a session bound but blocks it when another bot route is configured", async () => {
    const sessionConnection = readyZapi("session-connection");
    const configuredBotConnection = readyZapi("configured-bot-connection");
    await expect(
      assertWhatsappBotSessionRoute(
        context(),
        {
          channel: "WHATSAPP",
          connectionId: sessionConnection.id,
        } as never,
        ports(
          [sessionConnection, configuredBotConnection],
          policy({ defaultConnectionId: configuredBotConnection.id }),
        ),
      ),
    ).rejects.toMatchObject({ code: "CRM_WHATSAPP_BOT_ROUTE_MISMATCH" });
  });
});

async function captureError(action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    if (error instanceof WhatsappBotActionError) return error;
    throw error;
  }
  throw new Error("Expected a WhatsappBotActionError.");
}

function context() {
  return createServiceContext({
    actor: { externalId: "bot-1", id: "bot-1", kind: "integration" },
    entitlements: ["crm", "crm_zapi"],
    permissions: ["crm.whatsapp.send"],
    request: { requestId: "request-1" },
    storeId: "store-1",
    tenantId: "tenant-1",
  });
}

function readyZapi(id: string): CrmConnection {
  return {
    credentialsRef: {},
    displayName: id,
    externalConnectionId: null,
    externalInstanceId: id,
    id,
    metadata: { webhookSetup: { status: "configured" } },
    phone: "5511999999999",
    provider: "zapi",
    status: "active",
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
    webhookUrl: null,
  };
}

function canonicalConnection(connection: CrmConnection): CrmRoutingConnection {
  return {
    capabilities: {
      inbound: true,
      outbound: true,
      scheduling: false,
      templates: false,
    },
    channel: "whatsapp",
    connected: connection.status === "active",
    credentialBroker: "direct",
    degraded: false,
    displayName: connection.displayName,
    errorCode: null,
    id: connection.id,
    provider: "zapi",
    state: connection.status,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  };
}

function policy(
  input: Partial<CrmChannelRoutingPolicy>,
): CrmChannelRoutingPolicy {
  return {
    botConnectionId: null,
    botMode: "inherit_store_default",
    channel: "whatsapp",
    defaultConnectionId: null,
    id: "policy-1",
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
    ...input,
  };
}

function ports(
  connections: readonly CrmConnection[],
  configuredPolicy: CrmChannelRoutingPolicy | null,
  canonicalConnections: readonly CrmRoutingConnection[] = connections.map(
    canonicalConnection,
  ),
) {
  const routingPolicies: CrmRoutingPolicyRepository = {
    createDefaultIfMissing: async () => {
      throw new Error("Not implemented in route resolution tests.");
    },
    listPolicies: async () => (configuredPolicy ? [configuredPolicy] : []),
    upsertPolicy: async () => {
      throw new Error("Not implemented in route resolution tests.");
    },
  };
  const routingConnections: CrmRoutingConnectionRepository = {
    listConnections: async () => canonicalConnections,
  };
  return {
    crmConnectionRepository: createTestCrmConnectionRepository(connections),
    crmRepository: {} as never,
    crmRoutingConnectionRepository: routingConnections,
    crmRoutingPolicyRepository: routingPolicies,
  } as CrmServicePorts & {
    crmRoutingConnectionRepository: CrmRoutingConnectionRepository;
    crmRoutingPolicyRepository: CrmRoutingPolicyRepository;
  };
}
