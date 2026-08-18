import { describe, expect, it } from "vitest";
import type { CrmRealtimeEvent } from "../../../domains/crm/ports/crmRealtimePublisher.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import {
  actorUserId,
  connectionId,
  createZapiConnection,
  jsonPost,
  storeId,
  tenantId,
} from "./crm.conversationCycleActions.testSupport.js";

const otherUserId = "03030303-0303-4303-8303-030303030303";

describe("CRM cycle lifecycle", () => {
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
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await conversationRepository.ingestMessage({
      customerDisplayName: "Ana",
      customerPhone: "5511999999999",
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
      crmConversationRepository: conversationRepository,
    });

    const freshResponse = await app.request(
      "/api/v1/crm/conversation-cycles?filter=fresh",
    );
    expect(freshResponse.status).toBe(200);
    await expect(freshResponse.json()).resolves.toHaveLength(1);

    const assignResponse = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/actions/assign`,
      jsonPost({
        assignedUserId: actorUserId,
        commandId: "20000000-0000-4000-8000-000000000001",
      }),
    );
    expect(assignResponse.status).toBe(200);
    const assigned = (await assignResponse.json()) as {
      conversationCycle: { revision: number };
    };
    expect(assigned).toMatchObject({
      result: "applied",
      conversationCycle: { assignedUserId: actorUserId },
    });

    const reassignResponse = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/actions/assign`,
      jsonPost({
        assignedUserId: otherUserId,
        commandId: "20000000-0000-4000-8000-000000000004",
      }),
    );
    expect(reassignResponse.status).toBe(200);
    expect(realtimeEvents.at(-1)).toMatchObject({
      revokedUserId: actorUserId,
      conversationCycle: { assignedUserId: otherUserId },
      type: "conversationCycle",
    });

    const reassignBackResponse = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/actions/assign`,
      jsonPost({
        assignedUserId: actorUserId,
        commandId: "20000000-0000-4000-8000-000000000005",
      }),
    );
    expect(reassignBackResponse.status).toBe(200);

    const mineResponse = await app.request(
      "/api/v1/crm/conversation-cycles?filter=mine",
    );
    expect(mineResponse.status).toBe(200);
    await expect(mineResponse.json()).resolves.toHaveLength(1);

    const interventionResponse = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/attendance`,
      jsonPost({
        commandId: "20000000-0000-4000-8000-000000000002",
        enabled: true,
      }),
    );
    expect(interventionResponse.status).toBe(200);
    const interventionCommand = (await interventionResponse.json()) as {
      conversationCycle: { revision: number };
    };
    const intervention = interventionCommand.conversationCycle;
    expect(intervention).toMatchObject({
      humanAttendanceState: "IN_HUMAN_SERVICE",
      humanAttendanceStateVersion: 1,
      status: "HUMAN_TAKEOVER",
    });
    expect(realtimeEvents.at(-1)).toMatchObject({
      conversationCycle: {
        humanAttendanceState: "IN_HUMAN_SERVICE",
        humanAttendanceStateVersion: 1,
      },
      type: "conversationCycle",
    });

    const attendanceFilterResponse = await app.request(
      "/api/v1/crm/conversation-cycles?humanAttendanceState=IN_HUMAN_SERVICE",
    );
    expect(attendanceFilterResponse.status).toBe(200);
    await expect(attendanceFilterResponse.json()).resolves.toHaveLength(1);
    const countsResponse = await app.request(
      "/api/v1/crm/conversation-cycles/counts?humanAttendanceState=IN_HUMAN_SERVICE",
    );
    expect(countsResponse.status).toBe(200);
    await expect(countsResponse.json()).resolves.toMatchObject({
      inHumanService: 1,
      total: 1,
      waitingHuman: 0,
    });

    const closeResponse = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/actions/close`,
      jsonPost({ commandId: "20000000-0000-4000-8000-000000000003" }),
    );
    expect(closeResponse.status).toBe(200);
    const closedCommand = (await closeResponse.json()) as {
      result: string;
      conversationCycle: {
        humanAttendanceChangedAt: unknown;
        revision: number;
      };
    };
    expect(closedCommand.result).toBe("applied");
    const closed = closedCommand.conversationCycle;
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
          content: "Atendimento CRM concluido.",
        }),
      ]),
    );
  });
});
