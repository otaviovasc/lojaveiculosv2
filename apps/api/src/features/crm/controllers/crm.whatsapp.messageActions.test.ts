import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  createAuditSpy,
  createTestApp,
} from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM WhatsApp message actions", () => {
  it("sends and removes provider-backed reactions", async () => {
    const { audit, record } = createAuditSpy();
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await createInboundMessage(whatsappRepository);
    const sendReaction = vi.fn(async () => ({
      externalId: "zapi-reaction-1",
      providerTimestamp: new Date("2026-07-02T19:01:00.000Z"),
      raw: { messageId: "zapi-reaction-1" },
    }));
    const removeReaction = vi.fn(async () => ({
      externalId: "zapi-reaction-remove-1",
      providerTimestamp: new Date("2026-07-02T19:02:00.000Z"),
      raw: { messageId: "zapi-reaction-remove-1" },
    }));
    const app = createTestApp({
      audit,
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappGateway: {
        removeReaction,
        sendReaction,
      },
      crmWhatsappRepository: whatsappRepository,
    });

    const reactionResponse = await app.request(
      `/api/v1/crm/whatsapp/messages/${inbound.message.id}/reaction`,
      {
        body: JSON.stringify({ reaction: "👍" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(reactionResponse.status).toBe(200);
    await expect(reactionResponse.json()).resolves.toMatchObject({
      id: inbound.message.id,
      metadata: {
        reaction: {
          providerMessageId: "zapi-reaction-1",
          value: "👍",
        },
      },
    });
    expect(sendReaction).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionId, provider: "zapi" }),
      {
        messageId: "zapi-inbound-1",
        phone: "5511999999999",
        reaction: "👍",
      },
    );

    const removeResponse = await app.request(
      `/api/v1/crm/whatsapp/messages/${inbound.message.id}/reaction`,
      { method: "DELETE" },
    );

    expect(removeResponse.status).toBe(200);
    await expect(removeResponse.json()).resolves.toMatchObject({
      id: inbound.message.id,
      metadata: {
        reactionRemoved: {
          providerMessageId: "zapi-reaction-remove-1",
        },
      },
    });
    expect(removeReaction).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionId, provider: "zapi" }),
      {
        messageId: "zapi-inbound-1",
        phone: "5511999999999",
      },
    );
    expect(record.mock.calls.map((call) => call[0].outcome)).toEqual([
      "attempted",
      "succeeded",
      "attempted",
      "succeeded",
    ]);
  });

  it("deletes messages through the provider and persists deletedAt", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await createInboundMessage(whatsappRepository);
    const deleteMessage = vi.fn(async () => ({ raw: { ok: true } }));
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappGateway: {
        deleteMessage,
      },
      crmWhatsappRepository: whatsappRepository,
    });

    const response = await app.request(
      `/api/v1/crm/whatsapp/messages/${inbound.message.id}`,
      { method: "DELETE" },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { deletedAt?: string };
    expect(body.deletedAt).toEqual(expect.any(String));
    expect(deleteMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionId, provider: "zapi" }),
      {
        messageId: "zapi-inbound-1",
        owner: false,
        phone: "5511999999999",
      },
    );
  });
});

async function createInboundMessage(
  whatsappRepository: ReturnType<typeof createMemoryCrmWhatsappRepository>,
) {
  return whatsappRepository.ingestMessage({
    buyerName: "Ana",
    buyerPhone: "5511999999999",
    channel: "WHATSAPP",
    connectionId,
    content: "Ola",
    direction: "INBOUND",
    externalId: "zapi-inbound-1",
    metadata: {},
    providerTimestamp: new Date("2026-07-02T19:00:00.000Z"),
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId,
    tenantId,
    type: "TEXT",
  });
}

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
