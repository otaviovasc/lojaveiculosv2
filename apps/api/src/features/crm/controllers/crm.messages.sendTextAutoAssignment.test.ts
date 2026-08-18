import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmRealtimeEvent } from "../../../domains/crm/ports/crmRealtimePublisher.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createAuditSpy, createTestApp } from "./crm.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";
const actorUserId = "02020202-0202-4202-8202-020202020202";

describe("CRM send text auto-assignment", () => {
  it("assigns the cycle and lead before sending through ZAPI", async () => {
    const { audit, record } = createAuditSpy();
    const published: CrmRealtimeEvent[] = [];
    const crmRepository = createMemoryCrmRepository();
    const conversationRepository = createMemoryCrmConversationRepository();
    const lead = await crmRepository.createLead({
      buyerName: "Ana",
      buyerPhone: "5511999999999",
      source: "whatsapp",
      storeId,
      tenantId,
    });
    const inbound = await conversationRepository.ingestMessage({
      customerDisplayName: "Ana",
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId,
      content: "Ola",
      direction: "INBOUND",
      externalId: "inbound-1",
      freshLeadAt: new Date("2026-07-02T19:00:00.000Z"),
      leadId: lead.id,
      metadata: {},
      providerTimestamp: new Date("2026-07-02T19:00:00.000Z"),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const sendText = vi.fn(async () => {
      const [cycleAtProviderCall] =
        await conversationRepository.listConversationCycles({
          limit: 1,
          offset: 0,
          cycleId: inbound.conversationCycle.id,
          storeId,
          tenantId,
        });
      expect(cycleAtProviderCall?.assignedUserId).toBe(actorUserId);
      await expect(
        crmRepository.findLeadById({ leadId: lead.id, storeId, tenantId }),
      ).resolves.toMatchObject({ assignedUserId: actorUserId });
      return {
        externalId: "zapi-outbound-1",
        providerTimestamp: new Date("2026-07-02T19:01:00.000Z"),
        raw: { messageId: "zapi-outbound-1" },
      };
    });
    const app = createTestApp({
      audit,
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRealtimePublisher: {
        publish: async (event) => {
          published.push(event);
        },
      },
      crmRepository,
      crmMessagingGateway: {
        getConnectionStatus: vi.fn(),
        sendMedia: vi.fn(),
        sendText,
      },
      crmConversationRepository: conversationRepository,
      permissions: [
        "crm.conversations.read",
        "crm.messages.send",
      ] satisfies PermissionKey[],
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages`,
      {
        body: JSON.stringify({
          content: "Podemos conversar pelo WhatsApp.",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      content: "Podemos conversar pelo WhatsApp.",
      direction: "OUTBOUND",
      externalId: "zapi-outbound-1",
      senderType: "HUMAN",
      status: "SENT",
      type: "TEXT",
    });
    expect(sendText).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionId, provider: "zapi" }),
      {
        phone: "5511999999999",
        text: "Podemos conversar pelo WhatsApp.",
      },
    );
    const messages = await conversationRepository.listMessages({
      limit: 10,
      offset: 0,
      cycleId: inbound.conversationCycle.id,
      storeId,
      tenantId,
    });
    expect(messages.map((message) => message.direction)).toEqual([
      "OUTBOUND",
      "INBOUND",
    ]);
    const [cycle] = await conversationRepository.listConversationCycles({
      limit: 1,
      offset: 0,
      cycleId: inbound.conversationCycle.id,
      storeId,
      tenantId,
    });
    expect(cycle).toMatchObject({ assignedUserId: actorUserId });
    await expect(
      crmRepository.findLeadById({ leadId: lead.id, storeId, tenantId }),
    ).resolves.toMatchObject({ assignedUserId: actorUserId });
    expect(
      published.filter((event) => event.type === "conversationCycle").at(-1),
    ).toMatchObject({ conversationCycle: { assignedUserId: actorUserId } });
    expect(
      record.mock.calls
        .map((call) => call[0])
        .filter((event) => event.action === "crm.message.send_text")
        .map((event) => event.outcome),
    ).toEqual(["attempted", "succeeded"]);
    expect(record.mock.calls[0]?.[0]).toMatchObject({
      action: "crm.message.send_text",
      entityId: inbound.conversationCycle.id,
    });
    expect(
      record.mock.calls
        .map((call) => call[0])
        .filter(
          (event) => event.action === "crm.conversation_cycle.auto_assign",
        )
        .at(-1),
    ).toMatchObject({
      metadata: {
        assignedUserId: actorUserId,
        permission: "crm.messages.send",
        result: "applied",
        senderOrigin: "human_crm",
        senderType: "HUMAN",
      },
      outcome: "succeeded",
    });
    const freshResponse = await app.request(
      "/api/v1/crm/conversation-cycles?filter=fresh",
    );
    const mineResponse = await app.request(
      "/api/v1/crm/conversation-cycles?filter=mine",
    );
    await expect(freshResponse.json()).resolves.toEqual([]);
    await expect(mineResponse.json()).resolves.toMatchObject([
      { assignedUserId: actorUserId, id: inbound.conversationCycle.id },
    ]);
  });
});

function createZapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return createConfiguredZapiTestConnection({
    id: connectionId,
    overrides,
    storeId,
    tenantId,
  });
}
