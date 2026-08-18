import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import {
  createZapiConnection,
  postZapiWebhook,
} from "./crm.messaging.testSupport.js";
import { createAuditSpy, createTestApp } from "./crm.controller.testSupport.js";

const connectionId = "24000000-0000-4000-8000-000000000101";
const otherUserId = "03030303-0303-4303-8303-030303030303";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM outbound automatic assignment", () => {
  it("does not steal an existing assignee for a restricted sender", async () => {
    const { audit, record } = createAuditSpy();
    const crmRepository = createMemoryCrmRepository();
    const lead = await crmRepository.createLead({
      assignedUserId: otherUserId as never,
      buyerPhone: "5511999999988",
      source: "whatsapp",
      storeId,
      tenantId,
    });
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerPhone: "5511999999988",
      channel: "WHATSAPP",
      connectionId,
      content: "Ola",
      direction: "INBOUND",
      externalId: "inbound-assigned",
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
    await conversationRepository.updateConversationCycle({
      assignedUserId: otherUserId as never,
      cycleId: inbound.conversationCycle.id,
      storeId,
      tenantId,
    });
    const app = createTestApp({
      audit,
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConfiguredZapiTestConnection({
          id: connectionId,
          storeId,
          tenantId,
        }),
      ]),
      crmRepository,
      crmMessagingGateway: {
        sendText: vi.fn(async () => ({
          externalId: "zapi-outbound-assigned",
          providerTimestamp: new Date("2026-07-02T19:01:00.000Z"),
          raw: {},
        })),
      },
      crmConversationRepository: conversationRepository,
      permissions: ["crm.messages.send"] satisfies PermissionKey[],
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages`,
      {
        body: JSON.stringify({ content: "Resposta" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(404);
    const [cycle] = await conversationRepository.listConversationCycles({
      limit: 1,
      offset: 0,
      cycleId: inbound.conversationCycle.id,
      storeId,
      tenantId,
    });
    expect(cycle?.assignedUserId).toBe(otherUserId);
    await expect(
      crmRepository.findLeadById({ leadId: lead.id, storeId, tenantId }),
    ).resolves.toMatchObject({ assignedUserId: otherUserId });
    expect(
      record.mock.calls
        .map(([event]) => event)
        .filter((event) => event.action === "crm.message.send_text")
        .map((event) => event.outcome),
    ).toEqual(["attempted", "failed"]);
  });

  it("moves provider-direct human replies from fresh to unassigned", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmConversationRepository: conversationRepository,
    });
    const inboundResponse = await postZapiWebhook(app, {
      messageId: "auto-assignment-direct-inbound",
    });
    const inbound = (await inboundResponse.json()) as {
      conversationCycle: { id: string };
    };

    const directResponse = await postZapiWebhook(app, {
      fromMe: true,
      messageId: "auto-assignment-provider-direct",
      text: { message: "Resposta pelo aparelho" },
    });

    expect(directResponse.status).toBe(201);
    await expect(directResponse.json()).resolves.toMatchObject({
      message: { senderOrigin: "human_channel", senderType: "HUMAN" },
      conversationCycle: {
        assignedUserId: null,
        id: inbound.conversationCycle.id,
      },
    });
    const freshResponse = await app.request(
      "/api/v1/crm/conversation-cycles?filter=fresh",
    );
    const unassignedResponse = await app.request(
      "/api/v1/crm/conversation-cycles?filter=unassigned",
    );
    await expect(freshResponse.json()).resolves.toEqual([]);
    await expect(unassignedResponse.json()).resolves.toMatchObject([
      { assignedUserId: null, id: inbound.conversationCycle.id },
    ]);
  });
});
