import { describe, expect, it } from "vitest";
import type {
  EntitlementKey,
  PermissionKey,
  StoreId,
  TenantId,
} from "@lojaveiculosv2/shared";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmSpecialDateRepository } from "../../../domains/crm/testSupportSpecialDates.js";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import { createMemoryCrmConnectionMemberRepository } from "../adapters/memory/crmConnectionMemberRepository.js";

const connectionId = "24000000-0000-4000-8000-000000000401";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

function connection(): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {
      stored: {
        clientToken: "test-client-token",
        instanceId: "test-instance-id",
        instanceToken: "test-instance-token",
      },
    },
    displayName: "WhatsApp principal",
    externalConnectionId: "external-401",
    externalInstanceId: "instance-401",
    id: connectionId,
    metadata: {
      capabilities: { outbound: true, scheduling: true, text: true },
      connected: true,
    },
    phone: "5511999999401",
    provider: "zapi",
    revision: 0,
    status: "active",
    storeId,
    tenantId,
    webhookUrl: "https://api.example.test/webhooks/crm/401",
  };
}

function fixture(
  options: {
    connections?: readonly CrmConnection[];
    entitlements?: EntitlementKey[];
    permissions?: PermissionKey[];
    crmConnectionMemberRepository?: ReturnType<
      typeof createMemoryCrmConnectionMemberRepository
    >;
  } = {},
) {
  const connections = createTestCrmConnectionRepository([
    connection(),
    ...(options.connections ?? []),
  ]);
  return {
    app: createTestApp({
      crmConnectionRepository: connections,
      crmSpecialDateRepository: createMemoryCrmSpecialDateRepository(),
      ...(options.crmConnectionMemberRepository
        ? {
            crmConnectionMemberRepository:
              options.crmConnectionMemberRepository,
          }
        : {}),
      ...(options.entitlements ? { entitlements: options.entitlements } : {}),
      ...(options.permissions ? { permissions: options.permissions } : {}),
    }),
  };
}

function putConfig(
  app: ReturnType<typeof createTestApp>,
  path: string,
  input: Record<string, unknown>,
) {
  return app.request(path, {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
}

describe("CRM special-date routes", () => {
  it("returns all seven disabled defaults and persists one config revision", async () => {
    const { app } = fixture();

    const initial = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/special-dates`,
    );
    expect(initial.status).toBe(200);
    const initialBody = (await initial.json()) as {
      configs: Array<{ dateType: string; enabled: boolean; sendTime: string }>;
    };
    expect(initialBody.configs).toHaveLength(7);
    expect(initialBody.configs.every((config) => !config.enabled)).toBe(true);
    expect(
      initialBody.configs.every((config) => config.sendTime === "09:00"),
    ).toBe(true);

    const update = await putConfig(
      app,
      `/api/v1/crm/channel-connections/${connectionId}/special-dates/birthday`,
      {
        enabled: true,
        leadDays: 3,
        messageTemplate: "Parabéns, {nome}!",
        sendTime: "00:00",
      },
    );
    expect(update.status).toBe(200);
    expect(await update.json()).toMatchObject({
      config: {
        dateType: "birthday",
        enabled: true,
        leadDays: 3,
        messageTemplate: "Parabéns, {nome}!",
        sendTime: "00:00",
      },
    });
  });
  it("requires CRM entitlement and channel setup permission", async () => {
    const withoutPermission = fixture({ permissions: [] });
    const denied = await withoutPermission.app.request(
      `/api/v1/crm/channel-connections/${connectionId}/special-dates`,
    );
    expect(denied.status).toBe(403);

    const withoutEntitlement = fixture({ entitlements: [] });
    const unentitled = await withoutEntitlement.app.request(
      `/api/v1/crm/channel-connections/${connectionId}/special-dates`,
    );
    expect(unentitled.status).toBe(403);
  });
  it("requires explicit connection membership for a non-global actor", async () => {
    const members = createMemoryCrmConnectionMemberRepository();
    const withoutMembership = fixture({
      crmConnectionMemberRepository: members,
      permissions: ["crm.messaging.connection.setup"],
    });
    const denied = await withoutMembership.app.request(
      `/api/v1/crm/channel-connections/${connectionId}/special-dates`,
    );
    expect(denied.status).toBe(404);

    await members.grantMember({
      connectionId,
      grantedBy: "manager",
      storeId,
      tenantId,
      userId: "02020202-0202-4202-8202-020202020202" as never,
    });
    const allowed = fixture({
      crmConnectionMemberRepository: members,
      permissions: ["crm.messaging.connection.setup"],
    });
    const response = await allowed.app.request(
      `/api/v1/crm/channel-connections/${connectionId}/special-dates`,
    );
    expect(response.status).toBe(200);
  });
  it("rejects malformed config values and unknown date types", async () => {
    const { app } = fixture();
    const invalidBody = await putConfig(
      app,
      `/api/v1/crm/channel-connections/${connectionId}/special-dates/birthday`,
      { enabled: true, leadDays: 31, messageTemplate: "x", sendTime: "9:00" },
    );
    expect(invalidBody.status).toBe(400);
    const invalidType = await putConfig(
      app,
      `/api/v1/crm/channel-connections/${connectionId}/special-dates/newYear`,
      { enabled: true, leadDays: 0, messageTemplate: "x", sendTime: "09:00" },
    );
    expect(invalidType.status).toBe(400);
  });

  it("validates connection UUIDs and prevents cross-store access", async () => {
    const { app } = fixture({
      connections: [
        {
          ...connection(),
          id: "24000000-0000-4000-8000-000000000402",
          storeId: "store_2" as StoreId,
          tenantId: "tenant_2" as TenantId,
        },
      ],
    });

    const invalidConnectionId = await app.request(
      "/api/v1/crm/channel-connections/not-a-uuid/special-dates",
    );
    expect(invalidConnectionId.status).toBe(400);
    const crossStore = await app.request(
      "/api/v1/crm/channel-connections/24000000-0000-4000-8000-000000000402/special-dates",
    );
    expect(crossStore.status).toBe(404);
  });

  it("allows disabling an automation while its provider connection is disconnected", async () => {
    const disconnected = {
      ...connection(),
      id: "24000000-0000-4000-8000-000000000403",
      status: "disconnected" as const,
    };
    const { app } = fixture({ connections: [disconnected] });
    const response = await putConfig(
      app,
      "/api/v1/crm/channel-connections/24000000-0000-4000-8000-000000000403/special-dates/birthday",
      {
        enabled: false,
        leadDays: 0,
        messageTemplate: "Olá, {nome}!",
        sendTime: "09:00",
      },
    );
    expect(response.status).toBe(200);
  });

  it("does not enable automation on a connection outside the scheduling route", async () => {
    const secondary = {
      ...connection(),
      id: "24000000-0000-4000-8000-000000000404",
      externalConnectionId: "external-404",
      externalInstanceId: "instance-404",
    };
    const { app } = fixture({ connections: [secondary] });
    const response = await putConfig(
      app,
      "/api/v1/crm/channel-connections/24000000-0000-4000-8000-000000000404/special-dates/birthday",
      {
        enabled: true,
        leadDays: 0,
        messageTemplate: "Olá, {nome}!",
        sendTime: "09:00",
      },
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_MESSAGE_ACTION_ERROR",
    });
  });
});
