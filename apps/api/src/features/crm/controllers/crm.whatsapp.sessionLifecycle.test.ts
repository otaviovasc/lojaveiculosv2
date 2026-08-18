import { describe, expect, it } from "vitest";
import type { CrmRealtimeEvent } from "../../../domains/crm/ports/crmRealtimePublisher.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";
import {
  actorUserId,
  connectionId,
  createZapiConnection,
  jsonPost,
  storeId,
  tenantId,
} from "./crm.whatsapp.sessionActions.testSupport.js";

const otherUserId = "03030303-0303-4303-8303-030303030303";

describe("CRM WhatsApp session lifecycle", () => {
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
      senderOrigin: "customer",
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
      jsonPost({
        assignedUserId: actorUserId,
        commandId: "20000000-0000-4000-8000-000000000001",
      }),
    );
    expect(assignResponse.status).toBe(200);
    const assigned = (await assignResponse.json()) as {
      session: { revision: number };
    };
    expect(assigned).toMatchObject({
      result: "applied",
      session: { assignedUserId: actorUserId },
    });

    const reassignResponse = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/assign`,
      jsonPost({
        assignedUserId: otherUserId,
        commandId: "20000000-0000-4000-8000-000000000004",
      }),
    );
    expect(reassignResponse.status).toBe(200);
    expect(realtimeEvents.at(-1)).toMatchObject({
      revokedUserId: actorUserId,
      session: { assignedUserId: otherUserId },
      type: "session",
    });

    const reassignBackResponse = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/assign`,
      jsonPost({
        assignedUserId: actorUserId,
        commandId: "20000000-0000-4000-8000-000000000005",
      }),
    );
    expect(reassignBackResponse.status).toBe(200);

    const mineResponse = await app.request(
      "/api/v1/crm/whatsapp/sessions?filter=mine",
    );
    expect(mineResponse.status).toBe(200);
    await expect(mineResponse.json()).resolves.toHaveLength(1);

    const interventionResponse = await app.request(
      `/api/v1/crm/whatsapp/sessions/${inbound.session.id}/intervention`,
      jsonPost({
        commandId: "20000000-0000-4000-8000-000000000002",
        enabled: true,
      }),
    );
    expect(interventionResponse.status).toBe(200);
    const interventionCommand = (await interventionResponse.json()) as {
      session: { revision: number };
    };
    const intervention = interventionCommand.session;
    expect(intervention).toMatchObject({
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
      jsonPost({ commandId: "20000000-0000-4000-8000-000000000003" }),
    );
    expect(closeResponse.status).toBe(200);
    const closedCommand = (await closeResponse.json()) as {
      result: string;
      session: { humanAttendanceChangedAt: unknown; revision: number };
    };
    expect(closedCommand.result).toBe("applied");
    const closed = closedCommand.session;
    expect(closed).toMatchObject({
      assignedUserId: null,
      humanAttendanceState: null,
      humanAttendanceStateVersion: 2,
      humanHandlingStartedAt: null,
      interventionId: null,
      status: "COMPLETED",
    });
    expect(typeof closed.humanAttendanceChangedAt).toBe("string");
    expect(closed.revision).toBe(intervention.revision + 1);

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
