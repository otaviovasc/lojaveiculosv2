import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  connectionId,
  createZapiConnection,
} from "./crm.messaging.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM start conversation with an existing lead", () => {
  it("creates a new attendance when the phone only matches a closed lead", async () => {
    const crmRepository = createMemoryCrmRepository();
    const closed = await crmRepository.createLead({
      buyerPhone: "5511988887777",
      source: "manual",
      storeId,
      tenantId,
    });
    await crmRepository.updateLead({
      leadId: closed.id,
      status: "won",
      storeId,
      tenantId,
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRepository,
      crmMessagingGateway: {
        sendText: vi.fn(async () => ({
          externalId: "zapi-new-attendance",
          providerTimestamp: new Date("2026-07-03T15:10:00.000Z"),
          raw: {},
        })),
      },
      crmConversationRepository: createMemoryCrmConversationRepository(),
    });

    const response = await requestStartConversation(app, {
      channel: "whatsapp",
      recipientAddress: "11 98888-7777",
      text: "Novo atendimento.",
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as { lead: { id: string } };
    expect(body.lead.id).not.toBe(closed.id);
  });

  it("reuses an existing lead by normalized phone", async () => {
    const crmRepository = createMemoryCrmRepository();
    const existing = await crmRepository.createLead({
      buyerPhone: "5511988887777",
      source: "manual",
      storeId,
      tenantId,
    });
    const sendText = vi.fn(async () => ({
      externalId: "zapi-start-existing",
      providerTimestamp: new Date("2026-07-03T15:05:00.000Z"),
      raw: { messageId: "zapi-start-existing" },
    }));
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRepository,
      crmMessagingGateway: { sendText },
      crmConversationRepository: createMemoryCrmConversationRepository(),
    });

    const response = await requestStartConversation(app, {
      customerDisplayName: "Nome vindo do WhatsApp",
      channel: "whatsapp",
      recipientAddress: "11 98888-7777",
      text: "Retomando o atendimento.",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      lead: {
        buyerName: "Nome vindo do WhatsApp",
        id: existing.id,
        metadata: { crmMessaging: { firstDirection: "OUTBOUND" } },
        status: "contacted",
      },
      cycle: { leadId: existing.id },
    });
    expect(sendText).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ phone: "5511988887777" }),
    );
  });

  it("reuses an existing lead stored with a formatted phone", async () => {
    const crmRepository = createMemoryCrmRepository();
    const existing = await crmRepository.createLead({
      buyerName: "Cliente Formatado",
      buyerPhone: "(11) 98888-7777",
      source: "manual",
      storeId,
      tenantId,
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRepository,
      crmMessagingGateway: {
        sendText: vi.fn(async () => ({
          externalId: "zapi-start-formatted",
          providerTimestamp: new Date("2026-07-03T15:10:00.000Z"),
          raw: { messageId: "zapi-start-formatted" },
        })),
      },
      crmConversationRepository: createMemoryCrmConversationRepository(),
    });

    const response = await requestStartConversation(app, {
      channel: "whatsapp",
      recipientAddress: "5511988887777",
      text: "Chamando lead existente.",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      lead: { id: existing.id },
      cycle: { leadId: existing.id },
    });
  });
});

function requestStartConversation(
  app: ReturnType<typeof createTestApp>,
  body: Record<string, unknown>,
) {
  return app.request("/api/v1/crm/conversation-cycles", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}
