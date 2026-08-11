import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  connectionId,
  createZapiConnection,
} from "./crm.whatsapp.botForwarding.testSupport.js";
import {
  createAuditSpy,
  createTestApp,
} from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
type StartConversationBody = { lead: { id: string } };

describe("CRM WhatsApp start conversation", () => {
  it.each(["paused", "sandbox"] as const)(
    "rejects a %s connection before creating lead or message state",
    async (status) => {
      const crmRepository = createMemoryCrmRepository();
      const whatsappRepository = createMemoryCrmWhatsappRepository();
      const sendText = vi.fn();
      const app = createTestApp({
        crmConnectionRepository: createMemoryCrmConnectionRepository([
          { ...createZapiConnection(), status },
        ]),
        crmRepository,
        crmWhatsappGateway: { sendText },
        crmWhatsappRepository: whatsappRepository,
      });

      const response = await requestStartConversation(app, {
        connectionId,
        phone: "5511999999999",
        text: "Não deve sair.",
      });

      expect(response.status).toBe(409);
      await expectNoStartedConversation(crmRepository, whatsappRepository);
      expect(sendText).not.toHaveBeenCalled();
    },
  );

  it("rejects Z-API without its entitlement before creating lead or message state", async () => {
    const crmRepository = createMemoryCrmRepository();
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const sendText = vi.fn();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRepository,
      crmWhatsappGateway: { sendText },
      crmWhatsappRepository: whatsappRepository,
      entitlements: ["crm"],
    });

    const response = await requestStartConversation(app, {
      connectionId,
      phone: "5511999999999",
      text: "Não deve sair.",
    });

    expect(response.status).toBe(403);
    await expectNoStartedConversation(crmRepository, whatsappRepository);
    expect(sendText).not.toHaveBeenCalled();
  });

  it("rejects incomplete Z-API setup before creating lead or message state", async () => {
    const crmRepository = createMemoryCrmRepository();
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const sendText = vi.fn();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        { ...createZapiConnection(), metadata: {} },
      ]),
      crmRepository,
      crmWhatsappGateway: { sendText },
      crmWhatsappRepository: whatsappRepository,
    });

    const response = await requestStartConversation(app, {
      connectionId,
      phone: "5511999999999",
      text: "Não deve sair.",
    });

    expect(response.status).toBe(409);
    await expectNoStartedConversation(crmRepository, whatsappRepository);
    expect(sendText).not.toHaveBeenCalled();
  });

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
        humanAttendanceState: "IN_HUMAN_SERVICE",
        humanAttendanceStateVersion: 1,
        lastMessageContent: "Ola, tudo bem?",
        leadId: body.lead.id,
        status: "HUMAN_TAKEOVER",
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
      firstHandledAt: null,
      humanAttendanceState: null,
      lastMessageContent: "Mensagem com falha.",
      status: "ACTIVE",
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

async function expectNoStartedConversation(
  crmRepository: ReturnType<typeof createMemoryCrmRepository>,
  whatsappRepository: ReturnType<typeof createMemoryCrmWhatsappRepository>,
) {
  await expect(
    crmRepository.listLeads({ limit: 10, offset: 0, storeId, tenantId }),
  ).resolves.toEqual([]);
  await expect(
    whatsappRepository.listSessions({
      limit: 10,
      offset: 0,
      storeId,
      tenantId,
    }),
  ).resolves.toEqual([]);
}

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
