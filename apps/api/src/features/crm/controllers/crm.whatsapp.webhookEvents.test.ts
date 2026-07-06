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
  it("lists and retries ZAPI webhook event issues", async () => {
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
      "/api/v1/crm/whatsapp/provider-events/issues",
    );
    expect(listResponse.status).toBe(200);
    const listBody = (await listResponse.json()) as { events: unknown[] };
    expect(listBody.events).toHaveLength(1);
    expect(listBody.events[0]).toMatchObject({
      connectionId,
      attentionReason: "processing_failed",
      errorMessage: "Temporary processing failure",
      retryable: true,
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

  it("lists ignored received messages as retryable parser issues", async () => {
    const connections = createMemoryCrmConnectionRepository([
      createZapiConnection({ status: "active" }),
    ]);
    const webhookEvents = createMemoryCrmWebhookEventRepository();
    const payload = {
      messageId: "message_ignored_1",
      participantPhone: "5511999999999",
      phone: "123456789012345678901234",
      text: { message: "Ola" },
      type: "ReceivedCallback",
    };
    const recorded = await webhookEvents.recordReceived({
      connectionId,
      environment: "test",
      eventType: "crm.whatsapp.zapi.received",
      payload,
      provider: "zapi",
      providerEventId: buildZapiProviderEventId({
        connectionId,
        payload,
        type: "received",
      }),
      storeId,
      tenantId,
    });
    await webhookEvents.updateStatus({
      eventId: recorded.event.id,
      status: "ignored",
    });
    const app = createTestApp({
      crmConnectionRepository: connections,
      crmWebhookEventRepository: webhookEvents,
    });

    const listResponse = await app.request(
      "/api/v1/crm/whatsapp/provider-events/issues",
    );

    expect(listResponse.status).toBe(200);
    const listBody = (await listResponse.json()) as { events: unknown[] };
    expect(listBody.events).toHaveLength(1);
    expect(listBody.events[0]).toMatchObject({
      attentionReason: "received_message_ignored",
      retryable: true,
      status: "ignored",
      webhookType: "received",
    });
  });

  it("does not list ignored ZAPI group callbacks as parser issues", async () => {
    const webhookEvents = createMemoryCrmWebhookEventRepository();
    const payload = {
      isGroup: true,
      messageId: "message_group_1",
      participantPhone: "5511999999999",
      phone: "123456789012345678901234",
      text: { message: "Grupo" },
      type: "ReceivedCallback",
    };
    const recorded = await webhookEvents.recordReceived({
      connectionId,
      environment: "test",
      eventType: "crm.whatsapp.zapi.received",
      payload,
      provider: "zapi",
      providerEventId: buildZapiProviderEventId({
        connectionId,
        payload,
        type: "received",
      }),
      storeId,
      tenantId,
    });
    await webhookEvents.updateStatus({
      eventId: recorded.event.id,
      status: "ignored",
    });
    const app = createTestApp({
      crmWebhookEventRepository: webhookEvents,
    });

    const response = await app.request(
      "/api/v1/crm/whatsapp/provider-events/issues",
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ events: [] });
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
