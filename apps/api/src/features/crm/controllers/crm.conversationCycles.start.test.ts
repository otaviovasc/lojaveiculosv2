import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  connectionId,
  createZapiConnection,
} from "./crm.messaging.testSupport.js";
import { createAuditSpy, createTestApp } from "./crm.controller.testSupport.js";
import { requestStartConversation } from "./crm.startConversation.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const actorUserId = "02020202-0202-4202-8202-020202020202";
type StartConversationBody = { lead: { id: string } };
describe("CRM start conversation", () => {
  it.each(["paused", "sandbox"] as const)(
    "rejects a %s connection before creating lead or message state",
    async (status) => {
      const crmRepository = createMemoryCrmRepository();
      const conversationRepository = createMemoryCrmConversationRepository();
      const sendText = vi.fn();
      const app = createTestApp({
        crmConnectionRepository: createMemoryCrmConnectionRepository([
          { ...createZapiConnection(), status },
        ]),
        crmRepository,
        crmMessagingGateway: { sendText },
        crmConversationRepository: conversationRepository,
      });

      const response = await requestStartConversation(app, {
        channel: "whatsapp",
        recipientAddress: "5511999999999",
        text: "Não deve sair.",
      });

      expect(response.status).toBe(422);
      await expectNoStartedConversation(crmRepository, conversationRepository);
      expect(sendText).not.toHaveBeenCalled();
    },
  );

  it("rejects Z-API without its entitlement before creating lead or message state", async () => {
    const crmRepository = createMemoryCrmRepository();
    const conversationRepository = createMemoryCrmConversationRepository();
    const sendText = vi.fn();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRepository,
      crmMessagingGateway: { sendText },
      crmConversationRepository: conversationRepository,
      entitlements: ["crm"],
    });

    const response = await requestStartConversation(app, {
      channel: "whatsapp",
      recipientAddress: "5511999999999",
      text: "Não deve sair.",
    });

    expect(response.status).toBe(403);
    await expectNoStartedConversation(crmRepository, conversationRepository);
    expect(sendText).not.toHaveBeenCalled();
  });

  it("rejects incomplete Z-API setup before creating lead or message state", async () => {
    const crmRepository = createMemoryCrmRepository();
    const conversationRepository = createMemoryCrmConversationRepository();
    const sendText = vi.fn();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        { ...createZapiConnection(), metadata: {} },
      ]),
      crmRepository,
      crmMessagingGateway: { sendText },
      crmConversationRepository: conversationRepository,
    });

    const response = await requestStartConversation(app, {
      channel: "whatsapp",
      recipientAddress: "5511999999999",
      text: "Não deve sair.",
    });

    expect(response.status).toBe(422);
    await expectNoStartedConversation(crmRepository, conversationRepository);
    expect(sendText).not.toHaveBeenCalled();
  });

  it("creates a lead, sends the first text, and persists the conversation", async () => {
    const { audit, record } = createAuditSpy();
    const crmRepository = createMemoryCrmRepository();
    const conversationRepository = createMemoryCrmConversationRepository();
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
      crmMessagingGateway: { sendText },
      crmConversationRepository: conversationRepository,
    });

    const response = await requestStartConversation(app, {
      customerDisplayName: "Ana Silva",
      channel: "whatsapp",
      recipientAddress: "(11) 99999-9999",
      text: "Ola, tudo bem?",
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as StartConversationBody;
    expect(body).toMatchObject({
      lead: {
        assignedUserId: actorUserId,
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
      conversationCycle: {
        assignedUserId: actorUserId,
        customerDisplayName: "Ana Silva",
        customerPhone: "5511999999999",
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
      activityType: "message",
      content: "Ola, tudo bem?",
      direction: "outbound",
    });
    expect(
      record.mock.calls
        .map((call) => call[0])
        .filter((event) => event.action === "crm.conversation.start")
        .map((event) => event.outcome),
    ).toEqual(["attempted", "succeeded"]);
    expect(
      record.mock.calls
        .map((call) => call[0])
        .filter(
          (event) => event.action === "crm.conversation_cycle.auto_assign",
        )
        .at(-1),
    ).toMatchObject({ metadata: { result: "applied" } });
  });

  it("keeps a failed pending message when provider send fails", async () => {
    const crmRepository = createMemoryCrmRepository();
    const conversationRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRepository,
      crmMessagingGateway: {
        sendText: vi.fn(async () => {
          throw new Error("zapi unavailable");
        }),
      },
      crmConversationRepository: conversationRepository,
    });

    const response = await requestStartConversation(app, {
      channel: "whatsapp",
      recipientAddress: "(11) 97777-6666",
      text: "Mensagem com falha.",
    });

    expect(response.status).toBe(500);
    const [cycle] = await conversationRepository.listConversationCycles({
      limit: 1,
      offset: 0,
      storeId,
      tenantId,
    });
    expect(cycle?.firstHandledAt).toBeInstanceOf(Date);
    expect(cycle).toMatchObject({
      assignedUserId: actorUserId,
      customerPhone: "5511977776666",
      humanAttendanceState: null,
      lastMessageContent: "Mensagem com falha.",
      status: "ACTIVE",
    });
    const [message] = await conversationRepository.listMessages({
      limit: 1,
      offset: 0,
      cycleId: cycle!.id,
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
  conversationRepository: ReturnType<
    typeof createMemoryCrmConversationRepository
  >,
) {
  await expect(
    crmRepository.listLeads({ limit: 10, offset: 0, storeId, tenantId }),
  ).resolves.toEqual([]);
  await expect(
    conversationRepository.listConversationCycles({
      limit: 10,
      offset: 0,
      storeId,
      tenantId,
    }),
  ).resolves.toEqual([]);
}
