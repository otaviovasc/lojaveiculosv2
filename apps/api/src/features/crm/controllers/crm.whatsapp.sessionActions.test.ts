import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmRealtimeEvent } from "../../../domains/crm/ports/crmRealtimePublisher.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const actorUserId = "02020202-0202-4202-8202-020202020202";
const connectionId = "24000000-0000-4000-8000-000000000101";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM WhatsApp session actions", () => {
  it("marks sessions read and unread", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await whatsappRepository.ingestMessage({
      buyerName: "Bia",
      buyerPhone: "5511888888888",
      channel: "WHATSAPP",
      connectionId,
      content: "Ainda esta disponivel?",
      direction: "INBOUND",
      externalId: "inbound-read-1",
      metadata: {},
      providerTimestamp: new Date("2026-07-02T18:00:00.000Z"),
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappRepository: whatsappRepository,
    });

    const readResponse = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/read`,
      { method: "POST" },
    );
    expect(readResponse.status).toBe(200);
    await expect(readResponse.json()).resolves.toMatchObject({
      unreadCount: 0,
    });

    const unreadOnlyResponse = await app.request(
      "/api/v1/crm/whatsapp/sessions?unreadOnly=true",
    );
    expect(unreadOnlyResponse.status).toBe(200);
    await expect(unreadOnlyResponse.json()).resolves.toHaveLength(0);

    const unreadResponse = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/unread`,
      { method: "POST" },
    );
    expect(unreadResponse.status).toBe(200);
    await expect(unreadResponse.json()).resolves.toMatchObject({
      unreadCount: 1,
    });
  });

  it("assigns, toggles intervention, closes, and updates linked leads", async () => {
    const realtimeEvents: CrmRealtimeEvent[] = [];
    const crmRepository = createMemoryCrmRepository();
    const lead = await crmRepository.createLead({
      buyerName: "Ana",
      buyerPhone: "5511999999999",
      source: "whatsapp",
      storeId,
      tenantId,
    });
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await whatsappRepository.ingestMessage({
      buyerName: "Ana",
      buyerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId,
      content: "Ola, tenho interesse",
      direction: "INBOUND",
      externalId: "inbound-action-1",
      freshLeadAt: new Date("2026-07-02T19:00:00.000Z"),
      leadId: lead.id,
      metadata: {},
      providerTimestamp: new Date("2026-07-02T19:00:00.000Z"),
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRepository,
      crmRealtimePublisher: {
        publish: async (event) => {
          realtimeEvents.push(event);
        },
      },
      crmWhatsappRepository: whatsappRepository,
    });

    const freshResponse = await app.request(
      "/api/v1/crm/whatsapp/sessions?filter=fresh",
    );
    expect(freshResponse.status).toBe(200);
    await expect(freshResponse.json()).resolves.toHaveLength(1);

    const assignResponse = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/assign`,
      jsonPost({ assignedUserId: actorUserId }),
    );
    expect(assignResponse.status).toBe(200);
    await expect(assignResponse.json()).resolves.toMatchObject({
      assignedUserId: actorUserId,
    });

    const mineResponse = await app.request(
      "/api/v1/crm/whatsapp/sessions?filter=mine",
    );
    expect(mineResponse.status).toBe(200);
    await expect(mineResponse.json()).resolves.toHaveLength(1);

    const interventionResponse = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/intervention`,
      jsonPost({ enabled: true }),
    );
    expect(interventionResponse.status).toBe(200);
    await expect(interventionResponse.json()).resolves.toMatchObject({
      humanAttendanceState: "IN_HUMAN_SERVICE",
      humanAttendanceStateVersion: 1,
      status: "HUMAN_TAKEOVER",
    });
    expect(realtimeEvents.at(-1)).toMatchObject({
      session: {
        humanAttendanceState: "IN_HUMAN_SERVICE",
        humanAttendanceStateVersion: 1,
      },
      type: "session",
    });

    const attendanceFilterResponse = await app.request(
      "/api/v1/crm/whatsapp/sessions?humanAttendanceState=IN_HUMAN_SERVICE",
    );
    expect(attendanceFilterResponse.status).toBe(200);
    await expect(attendanceFilterResponse.json()).resolves.toHaveLength(1);
    const countsResponse = await app.request(
      "/api/v1/crm/whatsapp/session-counts?humanAttendanceState=IN_HUMAN_SERVICE",
    );
    expect(countsResponse.status).toBe(200);
    await expect(countsResponse.json()).resolves.toMatchObject({
      inHumanService: 1,
      total: 1,
      waitingHuman: 0,
    });

    const closeResponse = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/close`,
      { method: "POST" },
    );
    expect(closeResponse.status).toBe(200);
    const closed = (await closeResponse.json()) as {
      humanAttendanceChangedAt: unknown;
    };
    expect(closed).toMatchObject({
      assignedUserId: null,
      humanAttendanceState: null,
      humanAttendanceStateVersion: 2,
      humanHandlingStartedAt: null,
      interventionId: null,
      status: "COMPLETED",
    });
    expect(typeof closed.humanAttendanceChangedAt).toBe("string");

    const [updatedLead] = await crmRepository.listLeads({
      limit: 10,
      storeId,
      tenantId,
    });
    expect(updatedLead).toMatchObject({
      assignedUserId: actorUserId,
      status: "contacted",
    });
    await expect(
      crmRepository.listActivities({
        leadId: lead.id,
        limit: 10,
        storeId,
        tenantId,
      }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          activityType: "status_change",
          content: "Atendimento WhatsApp concluido.",
        }),
      ]),
    );
  });
});

function createZapiConnection(): CrmConnection {
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
  };
}

function jsonPost(body: Record<string, unknown>) {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  };
}
