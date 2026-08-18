import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.whatsapp.connectionFixtures.js";
import {
  createZapiConnection,
  postZapiWebhook,
} from "./crm.whatsapp.botForwarding.testSupport.js";
import {
  createAuditSpy,
  createTestApp,
} from "./crm.whatsapp.controller.testSupport.js";

const connectionId = "24000000-0000-4000-8000-000000000101";
const otherUserId = "03030303-0303-4303-8303-030303030303";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM WhatsApp outbound automatic assignment", () => {
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
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await whatsappRepository.ingestMessage({
      buyerPhone: "5511999999988",
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
    await whatsappRepository.updateSession({
      assignedUserId: otherUserId as never,
      sessionId: inbound.session.id,
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
      crmWhatsappGateway: {
        sendText: vi.fn(async () => ({
          externalId: "zapi-outbound-assigned",
          providerTimestamp: new Date("2026-07-02T19:01:00.000Z"),
          raw: {},
        })),
      },
      crmWhatsappRepository: whatsappRepository,
      permissions: ["crm.whatsapp.send"] satisfies PermissionKey[],
    });

    const response = await app.request("/api/v1/crm/whatsapp/send/text", {
      body: JSON.stringify({ sessionId: inbound.session.id, text: "Resposta" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(404);
    const [session] = await whatsappRepository.listSessions({
      limit: 1,
      offset: 0,
      sessionId: inbound.session.id,
      storeId,
      tenantId,
    });
    expect(session?.assignedUserId).toBe(otherUserId);
    await expect(
      crmRepository.findLeadById({ leadId: lead.id, storeId, tenantId }),
    ).resolves.toMatchObject({ assignedUserId: otherUserId });
    expect(
      record.mock.calls
        .map(([event]) => event)
        .filter((event) => event.action === "crm.whatsapp.message.send_text")
        .map((event) => event.outcome),
    ).toEqual(["attempted", "failed"]);
  });

  it("moves provider-direct human replies from fresh to unassigned", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappRepository: whatsappRepository,
    });
    const inboundResponse = await postZapiWebhook(app, {
      messageId: "auto-assignment-direct-inbound",
    });
    const inbound = (await inboundResponse.json()) as {
      session: { id: string };
    };

    const directResponse = await postZapiWebhook(app, {
      fromMe: true,
      messageId: "auto-assignment-provider-direct",
      text: { message: "Resposta pelo aparelho" },
    });

    expect(directResponse.status).toBe(201);
    await expect(directResponse.json()).resolves.toMatchObject({
      message: { senderOrigin: "human_whatsapp", senderType: "HUMAN" },
      session: { assignedUserId: null, id: inbound.session.id },
    });
    const freshResponse = await app.request(
      "/api/v1/crm/whatsapp/sessions?filter=fresh",
    );
    const unassignedResponse = await app.request(
      "/api/v1/crm/whatsapp/sessions?filter=unassigned",
    );
    await expect(freshResponse.json()).resolves.toEqual([]);
    await expect(unassignedResponse.json()).resolves.toMatchObject([
      { assignedUserId: null, id: inbound.session.id },
    ]);
  });
});
