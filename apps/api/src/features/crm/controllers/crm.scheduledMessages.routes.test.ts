import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmRoutingConnection } from "../../../domains/crm/ports/crmRoutingConnectionRepository.js";
import type { CrmChannelRoutingPolicy } from "../../../domains/crm/ports/crmRoutingPolicyRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createMemoryCrmRoutingRepositories } from "../adapters/memory/crmRoutingRepository.js";
import {
  defaultWhatsappPermissions,
  expectApiError,
  createTestApp,
} from "./crm.controller.testSupport.js";

const connectionId = "24000000-0000-4000-8000-000000000301";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM scheduled-message routes", () => {
  it("uses the server-owned default route with scheduling capability", async () => {
    const fixture = await scheduledFixture();

    const response = await schedule(fixture.app, fixture.cycleId);

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      connectionId,
      cycleId: fixture.cycleId,
      status: "pending",
    });
  });

  it.each([
    [
      "unsupported",
      { capabilities: capabilities({ scheduling: false }) },
      "capability_unsupported",
    ],
    ["disconnected", { connected: false }, "connection_not_connected"],
  ])("rejects a %s server-owned route", async (_label, override, reason) => {
    const fixture = await scheduledFixture({ connection: override });

    const response = await schedule(fixture.app, fixture.cycleId);

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      code: "CRM_ROUTING_POLICY_BLOCKED",
      details: { reason },
    });
  });

  it("rejects a stale default instead of falling back to the cycle connection", async () => {
    const fixture = await scheduledFixture({
      defaultConnectionId: "missing-default-connection",
    });

    const response = await schedule(fixture.app, fixture.cycleId);

    expect(response.status).toBe(422);
    const body = (await response.json()) as {
      code: string;
      details?: { reason?: string };
    };
    expect(body).toMatchObject({
      code: "CRM_ROUTING_POLICY_BLOCKED",
      details: { reason: "connection_not_found" },
    });
  });

  it("rejects a cycle bound to a connection outside the configured default route", async () => {
    const fixture = await scheduledFixture({
      additionalConnection: canonicalConnection({ id: "configured-default" }),
      defaultConnectionId: "configured-default",
    });

    const response = await schedule(fixture.app, fixture.cycleId);

    expect(response.status).toBe(409);
    await expectApiError(response, {
      code: "CRM_MESSAGE_ACTION_ERROR",
      message:
        "The conversation connection does not match the configured scheduled-message route.",
    });
  });

  it("denies missing create permission and CRM entitlement", async () => {
    const withoutPermission = await scheduledFixture({ permissions: [] });
    const permissionResponse = await schedule(
      withoutPermission.app,
      withoutPermission.cycleId,
    );
    expect(permissionResponse.status).toBe(403);
    await expectApiError(permissionResponse, {
      code: "AUTHORIZATION_DENIED",
      message: "Missing permission: crm.scheduled_messages.create",
    });

    const withoutEntitlement = await scheduledFixture({ entitlements: [] });
    const entitlementResponse = await schedule(
      withoutEntitlement.app,
      withoutEntitlement.cycleId,
    );
    expect(entitlementResponse.status).toBe(403);
    await expectApiError(entitlementResponse, {
      code: "AUTHORIZATION_DENIED",
      message: "Missing entitlement: crm",
    });
  });
});

async function scheduledFixture(
  input: {
    additionalConnection?: CrmRoutingConnection;
    connection?: Partial<CrmRoutingConnection>;
    defaultConnectionId?: string;
    entitlements?: [];
    permissions?: PermissionKey[];
  } = {},
) {
  const conversationRepository = createMemoryCrmConversationRepository();
  const ingested = await conversationRepository.ingestMessage({
    customerPhone: "5511999999301",
    channel: "WHATSAPP",
    connectionId,
    content: "Oi",
    direction: "INBOUND",
    externalId: "scheduled-route-seed",
    metadata: {},
    providerTimestamp: new Date("2026-08-18T12:00:00.000Z"),
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId,
    tenantId,
    type: "TEXT",
  });
  const connection = canonicalConnection(input.connection);
  const routing = createMemoryCrmRoutingRepositories({
    connections: [
      connection,
      ...(input.additionalConnection ? [input.additionalConnection] : []),
    ],
    policies: [policy(input.defaultConnectionId ?? connection.id)],
  });
  return {
    app: createTestApp({
      crmRoutingConnectionRepository: routing.connectionRepository,
      crmRoutingPolicyRepository: routing.policyRepository,
      crmConversationRepository: conversationRepository,
      ...(input.entitlements ? { entitlements: input.entitlements } : {}),
      permissions: input.permissions ?? defaultWhatsappPermissions,
    }),
    cycleId: ingested.conversationCycle.id,
  };
}

function schedule(app: ReturnType<typeof createTestApp>, cycleId: string) {
  return app.request("/api/v1/crm/scheduled-messages", {
    body: JSON.stringify({
      scheduledAt: "2030-01-01T10:00:00.000Z",
      cycleId,
      content: "Mensagem agendada",
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

function canonicalConnection(
  override: Partial<CrmRoutingConnection> = {},
): CrmRoutingConnection {
  return {
    capabilities: capabilities(),
    channel: "whatsapp",
    connected: true,
    credentialBroker: "direct",
    degraded: false,
    displayName: "WhatsApp principal",
    errorCode: null,
    id: connectionId,
    provider: "zapi",
    state: "active",
    storeId,
    tenantId,
    ...override,
  };
}

function capabilities(
  override: Partial<CrmRoutingConnection["capabilities"]> = {},
) {
  return {
    inbound: true,
    outbound: true,
    scheduling: true,
    templates: false,
    ...override,
  };
}

function policy(defaultConnectionId: string): CrmChannelRoutingPolicy {
  return {
    externalBotConnectionId: null,
    externalBotMode: "disabled",
    channel: "whatsapp",
    defaultConnectionId,
    id: "scheduled-route-policy",
    storeId,
    tenantId,
  };
}
