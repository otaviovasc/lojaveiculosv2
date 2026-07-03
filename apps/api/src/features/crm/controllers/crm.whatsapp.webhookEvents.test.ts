import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { buildZapiProviderEventId } from "../../../domains/crm/whatsapp/zapiWebhookEventKey.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWebhookEventRepository } from "../adapters/memory/crmWebhookEventRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const connectionId = "24000000-0000-4000-8000-000000000101";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM WhatsApp provider event retry", () => {
  it("lists and retries failed ZAPI webhook events", async () => {
    const connections = createMemoryCrmConnectionRepository([
      createZapiConnection({ status: "disconnected" }),
    ]);
    const webhookEvents = createMemoryCrmWebhookEventRepository();
    const payload = { connectedPhone: "5511999999999", status: "CONNECTED" };
    const recorded = await webhookEvents.recordReceived({
      connectionId,
      environment: "test",
      eventType: "crm.whatsapp.zapi.connected",
      payload,
      provider: "zapi",
      providerEventId: buildZapiProviderEventId({
        connectionId,
        payload,
        type: "connected",
      }),
      storeId,
      tenantId,
    });
    await webhookEvents.updateStatus({
      errorMessage: "Temporary processing failure",
      eventId: recorded.event.id,
      status: "failed",
    });
    const app = createTestApp({
      crmConnectionRepository: connections,
      crmWebhookEventRepository: webhookEvents,
    });

    const listResponse = await app.request(
      "/api/v1/crm/whatsapp/provider-events/failed",
    );
    expect(listResponse.status).toBe(200);
    const listBody = (await listResponse.json()) as { events: unknown[] };
    expect(listBody.events).toHaveLength(1);
    expect(listBody.events[0]).toMatchObject({
      connectionId,
      errorMessage: "Temporary processing failure",
      status: "failed",
      webhookType: "connected",
    });

    const retryResponse = await app.request(
      `/api/v1/crm/whatsapp/provider-events/${recorded.event.id}/retry`,
      { method: "POST" },
    );
    expect(retryResponse.status).toBe(200);
    const retryBody = (await retryResponse.json()) as {
      event: { status: string };
      result: { status: string };
    };
    expect(retryBody).toMatchObject({
      event: { status: "processed" },
      result: { status: "accepted" },
    });
    await expect(
      connections.findConnectionById(connectionId),
    ).resolves.toMatchObject({
      phone: "5511999999999",
      status: "active",
    });
  });
});

function createZapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return {
    credentialsRef: {},
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
    ...overrides,
  };
}
