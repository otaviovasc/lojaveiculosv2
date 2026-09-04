import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createTestCrmConversationCycle } from "../testSupportWhatsapp.js";
import { createMemoryExternalBotManager } from "./testSupportExternalBotManager.js";
import { enqueueCrmAttendanceExternalBotEvent } from "./externalBotEventForwarding.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";

describe("external bot attendance notifications", () => {
  it("queues the AI pause and human acknowledgement without issuing action grants", async () => {
    let attendanceRevision = 1;
    const manager = createMemoryExternalBotManager({
      inspect: async () => ({
        attendanceRevision,
        humanAttendanceActive: true,
        revision: attendanceRevision,
        scopeExists: true,
      }),
    });
    const issueGrant = vi.spyOn(manager.ports.grantStore, "issue");
    const context = createServiceContext({
      actor: { id: "seller-1", kind: "user" },
      permissions: ["crm.bot.events.publish"],
      request: { requestId: "attendance-test" },
      storeId: "store-1",
      tenantId: "tenant-1",
    });
    const ports = {
      externalBotManager: manager.ports,
      crmExternalBotIntegrationRepository: {
        findExternalBotIntegration: async () => ({
          enabled: true,
          id: "integration-1",
        }),
      },
    } as unknown as CrmServicePorts;
    const connection = {
      channel: "whatsapp",
      id: "connection-1",
      provider: "zapi",
      storeId: "store-1",
      tenantId: "tenant-1",
    } as Parameters<
      typeof enqueueCrmAttendanceExternalBotEvent
    >[1]["connection"];
    for (const state of ["WAITING_HUMAN", "IN_HUMAN_SERVICE"] as const) {
      const cycle = createTestCrmConversationCycle({
        humanAttendanceState: state,
        humanAttendanceStateVersion: attendanceRevision,
        interventionId: "intervention-1",
        revision: attendanceRevision,
        status: "HUMAN_TAKEOVER",
        threadId: "thread-1",
      });
      const input = {
        active: true,
        attendanceState: state,
        attendanceStateVersion: attendanceRevision,
        connection,
        conversationCycle: cycle,
      };
      await enqueueCrmAttendanceExternalBotEvent(context, input, ports);
      await enqueueCrmAttendanceExternalBotEvent(context, input, ports);
      attendanceRevision += 1;
    }
    expect(manager.events).toHaveLength(2);
    expect(manager.events.map(({ event }) => event.payload)).toEqual([
      expect.objectContaining({
        humanAttendanceState: "WAITING_HUMAN",
        humanAttendanceStateVersion: 1,
      }),
      expect.objectContaining({
        humanAttendanceState: "IN_HUMAN_SERVICE",
        humanAttendanceStateVersion: 2,
      }),
    ]);
    expect(manager.events.every(({ event }) => event.grant === null)).toBe(
      true,
    );
    expect(issueGrant).not.toHaveBeenCalled();
    expect(manager.events[0]?.event.id).not.toBe(manager.events[1]?.event.id);
    manager.ports.effectAuthorizer.inspect = async () => ({
      attendanceRevision: 3,
      humanAttendanceActive: false,
      revision: 3,
      scopeExists: true,
    });
    await enqueueCrmAttendanceExternalBotEvent(
      context,
      {
        active: false,
        connection,
        conversationCycle: createTestCrmConversationCycle({
          humanAttendanceStateVersion: 3,
          revision: 3,
          threadId: "thread-1",
        }),
      },
      ports,
    );
    expect(manager.events).toHaveLength(3);
    expect(manager.events[2]?.event).toMatchObject({
      actionClass: "effect",
      payload: { humanAttendanceActive: false, humanAttendanceState: null },
    });
    expect(manager.events[2]?.event.grant).toBeTypeOf("string");
    expect(issueGrant).toHaveBeenCalledTimes(1);
  });
});
