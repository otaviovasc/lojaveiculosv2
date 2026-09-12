import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createTestCrmConversationCycle } from "../testSupportWhatsapp.js";
import { createMemoryExternalBotManager } from "./testSupportExternalBotManager.js";
import {
  enqueueCrmAttendanceExternalBotEvent,
  enqueueCrmMessageExternalBotEvent,
} from "./externalBotEventForwarding.js";
import { canonicalExternalBotActionRequest } from "./externalBotCanonicalRequest.js";
import { executeExternalBotAction } from "./services/ExternalBotManagerService/executeExternalBotAction.js";
import { createExternalBotActionContext } from "./testSupportExternalBotAction.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import type { CrmMessage } from "../ports/crmConversationRepository.js";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

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
      crmExternalBotProfileRepository: {
        findProfileForConnection: async () => ({
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

describe("external bot inbound message reply grant", () => {
  const connection = {
    channel: "whatsapp",
    id: "connection-1",
    provider: "zapi",
    storeId: "store-1",
    tenantId: "tenant-1",
  } as Parameters<typeof enqueueCrmMessageExternalBotEvent>[1]["connection"];

  const createdAt = new Date("2026-08-10T14:00:00.000Z");

  function inboundMessage(
    direction: "INBOUND" | "OUTBOUND" = "INBOUND",
  ): CrmMessage {
    return {
      channel: "WHATSAPP",
      connectionId: "connection-1",
      createdAt,
      cycleId: "conversationCycle-1",
      direction,
      id: "message-1",
      storeId: "store-1" as StoreId,
      tenantId: "tenant-1" as TenantId,
      type: "TEXT",
    } as CrmMessage;
  }

  function forwardingPorts(
    manager: ReturnType<typeof createMemoryExternalBotManager>,
  ) {
    return {
      externalBotManager: manager.ports,
      crmExternalBotProfileRepository: {
        findProfileForConnection: async () => ({
          enabled: true,
          id: "integration-1",
        }),
      },
    } as unknown as CrmServicePorts;
  }

  function forwardingContext() {
    return createServiceContext({
      actor: { id: "seller-1", kind: "user" },
      permissions: ["crm.bot.events.publish"],
      request: { requestId: "message-forward-test" },
      storeId: "store-1",
      tenantId: "tenant-1",
    });
  }

  it("grants message.send_text for inbound messages and authorizes the reply end to end", async () => {
    const manager = createMemoryExternalBotManager();
    const cycle = createTestCrmConversationCycle({
      humanAttendanceStateVersion: 2,
      revision: 1,
      status: "ACTIVE",
      threadId: "thread-1",
    });
    await enqueueCrmMessageExternalBotEvent(
      forwardingContext(),
      { connection, conversationCycle: cycle, message: inboundMessage() },
      forwardingPorts(manager),
    );
    expect(manager.events).toHaveLength(1);
    const event = manager.events[0]!.event;
    expect(event).toMatchObject({
      actionClass: "effect",
      payload: { action: "message.send_text", direction: "inbound" },
      provider: "zapi",
    });
    expect(event.grant).toBeTypeOf("string");

    const reply = {
      capabilityGrant: event.grant!,
      channel: event.channel,
      command: {
        action: "message.send_text" as const,
        payload: { text: "Temos o veículo em estoque!" },
      },
      connectionId: event.connectionId,
      expectedAttendanceRevision: event.payload.expectedAttendanceRevision!,
      expectedRevision: event.payload.expectedRevision!,
      idempotencyKey: event.payload.idempotencyKey!,
      integrationId: event.integrationId,
      modelVersion: event.modelVersion,
      provider: event.provider,
      storeId: event.storeId,
      tenantId: event.tenantId,
      threadId: event.threadId,
    };
    const requestDigest = manager.ports.digest.digest(
      canonicalExternalBotActionRequest(reply),
    );
    const result = await executeExternalBotAction(
      createExternalBotActionContext(),
      { ...reply, requestDigest },
      manager.ports,
    );
    expect(result.status).toBe("completed");
  });

  it("keeps conversation.summarize for outbound message events", async () => {
    const manager = createMemoryExternalBotManager();
    const cycle = createTestCrmConversationCycle({
      humanAttendanceStateVersion: 2,
      revision: 1,
      status: "ACTIVE",
      threadId: "thread-1",
    });
    await enqueueCrmMessageExternalBotEvent(
      forwardingContext(),
      {
        connection,
        conversationCycle: cycle,
        message: inboundMessage("OUTBOUND"),
      },
      forwardingPorts(manager),
    );
    expect(manager.events[0]?.event.payload).toMatchObject({
      action: "conversation.summarize",
      direction: "outbound",
    });
  });
});
