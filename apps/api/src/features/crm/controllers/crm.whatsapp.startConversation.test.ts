import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  createAuditSpy,
  createTestApp,
} from "./crm.whatsapp.controller.testSupport.js";

const connectionId = "24000000-0000-4000-8000-000000000101";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
type StartConversationBody = { lead: { id: string } };

describe("CRM WhatsApp start conversation", () => {
  it("creates a lead, sends the first text, and persists the conversation", async () => {
    const { audit, record } = createAuditSpy();
    const crmRepository = createMemoryCrmRepository();
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const sendText = vi.fn(async () => ({
      externalId: "zapi-start-1",
      providerTimestamp: new Date("2026-07-03T15:00:00.000Z"),
      raw: { messageId: "zapi-start-1" },
    }));
    const app = createTestApp({
      audit,
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRepository,
      crmWhatsappGateway: { sendText },
      crmWhatsappRepository: whatsappRepository,
    });

    const response = await requestStartConversation(app, {
      buyerName: "Ana Silva",
      connectionId,
      phone: "(11) 99999-9999",
      text: "Ola, tudo bem?",
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as StartConversationBody;
    expect(body).toMatchObject({
      lead: {
        buyerName: "Ana Silva",
        buyerPhone: "5511999999999",
        source: "whatsapp",
        status: "contacted",
      },
      message: {
        content: "Ola, tudo bem?",
        direction: "OUTBOUND",
        externalId: "zapi-start-1",
        status: "SENT",
        type: "TEXT",
      },
      session: {
        buyerName: "Ana Silva",
        buyerPhone: "5511999999999",
        lastMessageContent: "Ola, tudo bem?",
        leadId: body.lead.id,
      },
    });
    expect(sendText).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionId, provider: "zapi" }),
      { phone: "5511999999999", text: "Ola, tudo bem?" },
    );

    const activities = await crmRepository.listActivities({
      leadId: body.lead.id,
      limit: 10,
      storeId,
      tenantId,
    });
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      activityType: "whatsapp",
      content: "Ola, tudo bem?",
      direction: "outbound",
    });
    expect(record.mock.calls.map((call) => call[0].outcome)).toEqual([
      "attempted",
      "succeeded",
    ]);
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
      crmWhatsappGateway: { sendText },
      crmWhatsappRepository: createMemoryCrmWhatsappRepository(),
    });

    const response = await requestStartConversation(app, {
      buyerName: "Nome vindo do WhatsApp",
      connectionId,
      phone: "11 98888-7777",
      text: "Retomando o atendimento.",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      lead: {
        buyerName: "Nome vindo do WhatsApp",
        id: existing.id,
        metadata: { crmWhatsapp: { firstDirection: "OUTBOUND" } },
        status: "contacted",
      },
      session: { leadId: existing.id },
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
      crmWhatsappGateway: {
        sendText: vi.fn(async () => ({
          externalId: "zapi-start-formatted",
          providerTimestamp: new Date("2026-07-03T15:10:00.000Z"),
          raw: { messageId: "zapi-start-formatted" },
        })),
      },
      crmWhatsappRepository: createMemoryCrmWhatsappRepository(),
    });

    const response = await requestStartConversation(app, {
      connectionId,
      phone: "5511988887777",
      text: "Chamando lead existente.",
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      lead: { id: existing.id },
      session: { leadId: existing.id },
    });
  });

  it("keeps a failed pending message when provider send fails", async () => {
    const crmRepository = createMemoryCrmRepository();
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRepository,
      crmWhatsappGateway: {
        sendText: vi.fn(async () => {
          throw new Error("zapi unavailable");
        }),
      },
      crmWhatsappRepository: whatsappRepository,
    });

    const response = await requestStartConversation(app, {
      connectionId,
      phone: "(11) 97777-6666",
      text: "Mensagem com falha.",
    });

    expect(response.status).toBe(500);
    const [session] = await whatsappRepository.listSessions({
      limit: 1,
      offset: 0,
      storeId,
      tenantId,
    });
    expect(session).toMatchObject({
      buyerPhone: "5511977776666",
      lastMessageContent: "Mensagem com falha.",
    });
    const [message] = await whatsappRepository.listMessages({
      limit: 1,
      offset: 0,
      sessionId: session!.id,
      storeId,
      tenantId,
    });
    expect(message).toMatchObject({
      content: "Mensagem com falha.",
      status: "FAILED",
    });
  });
});

function requestStartConversation(
  app: ReturnType<typeof createTestApp>,
  body: Record<string, unknown>,
) {
  return app.request("/api/v1/crm/whatsapp/conversations/start", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
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
