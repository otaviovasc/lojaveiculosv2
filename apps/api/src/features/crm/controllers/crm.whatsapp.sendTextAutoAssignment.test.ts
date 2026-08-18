import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmRealtimeEvent } from "../../../domains/crm/ports/crmRealtimePublisher.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.whatsapp.connectionFixtures.js";
import {
  createAuditSpy,
  createTestApp,
} from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";
const actorUserId = "02020202-0202-4202-8202-020202020202";

describe("CRM WhatsApp send text auto-assignment", () => {
  it("assigns the session and lead before sending through ZAPI", async () => {
    const { audit, record } = createAuditSpy();
    const published: CrmRealtimeEvent[] = [];
    const crmRepository = createMemoryCrmRepository();
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const lead = await crmRepository.createLead({
      buyerName: "Ana",
      buyerPhone: "5511999999999",
      source: "whatsapp",
      storeId,
      tenantId,
    });
    const inbound = await whatsappRepository.ingestMessage({
      buyerName: "Ana",
      buyerPhone: "5511999999999",
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
      const [sessionAtProviderCall] = await whatsappRepository.listSessions({
        limit: 1,
        offset: 0,
        sessionId: inbound.session.id,
        storeId,
        tenantId,
      });
      expect(sessionAtProviderCall?.assignedUserId).toBe(actorUserId);
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
      crmWhatsappGateway: {
        getConnectionStatus: vi.fn(),
        sendMedia: vi.fn(),
        sendText,
      },
      crmWhatsappRepository: whatsappRepository,
      permissions: [
        "crm.whatsapp.list",
        "crm.whatsapp.send",
      ] satisfies PermissionKey[],
    });

    const response = await app.request("/api/v1/crm/whatsapp/send/text", {
      body: JSON.stringify({
        sessionId: inbound.session.id,
        text: "Podemos conversar pelo WhatsApp.",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

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
    const messages = await whatsappRepository.listMessages({
      limit: 10,
      offset: 0,
      sessionId: inbound.session.id,
      storeId,
      tenantId,
    });
    expect(messages.map((message) => message.direction)).toEqual([
      "OUTBOUND",
      "INBOUND",
    ]);
    const [session] = await whatsappRepository.listSessions({
      limit: 1,
      offset: 0,
      sessionId: inbound.session.id,
      storeId,
      tenantId,
    });
    expect(session).toMatchObject({ assignedUserId: actorUserId });
    await expect(
      crmRepository.findLeadById({ leadId: lead.id, storeId, tenantId }),
    ).resolves.toMatchObject({ assignedUserId: actorUserId });
    expect(
      published.filter((event) => event.type === "session").at(-1),
    ).toMatchObject({ session: { assignedUserId: actorUserId } });
    expect(
      record.mock.calls
        .map((call) => call[0])
        .filter((event) => event.action === "crm.whatsapp.message.send_text")
        .map((event) => event.outcome),
    ).toEqual(["attempted", "succeeded"]);
    expect(record.mock.calls[0]?.[0]).toMatchObject({
      action: "crm.whatsapp.message.send_text",
      entityId: inbound.session.id,
    });
    expect(
      record.mock.calls
        .map((call) => call[0])
        .filter((event) => event.action === "crm.whatsapp.session.auto_assign")
        .at(-1),
    ).toMatchObject({
      metadata: {
        assignedUserId: actorUserId,
        permission: "crm.whatsapp.send",
        result: "applied",
        senderOrigin: "human_crm",
        senderType: "HUMAN",
      },
      outcome: "succeeded",
    });
    const freshResponse = await app.request(
      "/api/v1/crm/whatsapp/sessions?filter=fresh",
    );
    const mineResponse = await app.request(
      "/api/v1/crm/whatsapp/sessions?filter=mine",
    );
    await expect(freshResponse.json()).resolves.toEqual([]);
    await expect(mineResponse.json()).resolves.toMatchObject([
      { assignedUserId: actorUserId, id: inbound.session.id },
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
