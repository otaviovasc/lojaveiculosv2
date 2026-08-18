import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmRealtimeEventEnvelope } from "../../domains/crm/ports/crmRealtimePublisher.js";
import { createTestCrmConversationCycle } from "../../domains/crm/testSupportWhatsapp.js";
import { createCrmRealtimeBroker } from "./crmRealtimeBroker.js";

const storeId = "store-1" as StoreId;
const tenantId = "tenant-1" as TenantId;
const actorUserId = "02020202-0202-4202-8202-020202020202" as UserId;
const otherUserId = "03030303-0303-4303-8303-030303030303" as UserId;

describe("createCrmRealtimeBroker", () => {
  it("consumes a realtime ticket atomically", async () => {
    const broker = createCrmRealtimeBroker();
    const issued = await broker.issueTicket({
      queueVisibility: { kind: "global" },
      storeId,
      tenantId,
    });

    const resolutions = await Promise.all([
      broker.resolveTicket(issued.ticket),
      broker.resolveTicket(issued.ticket),
    ]);

    expect(resolutions.filter(Boolean)).toHaveLength(1);
    expect(resolutions.filter((scope) => scope === null)).toHaveLength(1);
  });

  it("revokes a previous assignee live and does not replay stale ownership", async () => {
    const broker = createCrmRealtimeBroker();
    await broker.publish(presenceEvent("baseline"));
    const [baseline] = await broker.replay({
      queueVisibility: { kind: "global" },
      sinceEventId: "0-0",
      storeId,
      tenantId,
    });
    expect(baseline).toBeDefined();

    const actorEvents = vi.fn<(event: CrmRealtimeEventEnvelope) => void>();
    const otherEvents = vi.fn();
    const managerEvents = vi.fn();
    broker.subscribe({
      onEvent: actorEvents,
      queueVisibility: { kind: "assigned", userId: actorUserId },
      storeId,
      tenantId,
    });
    broker.subscribe({
      onEvent: otherEvents,
      queueVisibility: { kind: "assigned", userId: otherUserId },
      storeId,
      tenantId,
    });
    broker.subscribe({
      onEvent: managerEvents,
      queueVisibility: { kind: "global" },
      storeId,
      tenantId,
    });

    await broker.publish(sessionEvent("conversationCycle-1", actorUserId, 1));
    await broker.publish(
      sessionEvent("conversationCycle-1", otherUserId, 2, actorUserId),
    );
    await broker.publish(sessionEvent("conversationCycle-unassigned", null));

    expect(actorEvents).toHaveBeenCalledTimes(2);
    expect(actorEvents.mock.calls.at(-1)?.[0].event).toMatchObject({
      revokedUserId: actorUserId,
      conversationCycle: { assignedUserId: otherUserId },
    });
    expect(otherEvents).toHaveBeenCalledOnce();
    expect(managerEvents).toHaveBeenCalledTimes(3);
    const actorReplay = await broker.replay({
      queueVisibility: { kind: "assigned", userId: actorUserId },
      sinceEventId: baseline!.id,
      storeId,
      tenantId,
    });
    const managerReplay = await broker.replay({
      queueVisibility: { kind: "global" },
      sinceEventId: baseline!.id,
      storeId,
      tenantId,
    });
    expect(actorReplay).toHaveLength(1);
    expect(actorReplay[0]?.event).toMatchObject({
      revokedUserId: actorUserId,
      conversationCycle: { assignedUserId: otherUserId },
    });
    expect(managerReplay).toHaveLength(3);
  });
});

function sessionEvent(
  cycleId: string,
  assignedUserId: UserId | null,
  revision = 1,
  revokedUserId?: UserId,
) {
  return {
    connectionId: connection.id,
    ...(revokedUserId ? { revokedUserId } : {}),
    conversationCycle: createTestCrmConversationCycle({
      assignedUserId,
      connectionId: connection.id,
      id: cycleId,
      storeId,
      tenantId,
      revision,
    }),
    storeId,
    tenantId,
    type: "conversationCycle" as const,
  };
}

function presenceEvent(state: string) {
  return {
    connectionId: connection.id,
    payload: { state },
    storeId,
    tenantId,
    type: "presence" as const,
  };
}

const connection: CrmConnection = {
  broker: "direct",
  channel: "whatsapp",
  credentialsRef: {},
  displayName: "Realtime connection",
  externalConnectionId: null,
  externalInstanceId: null,
  id: "connection-1",
  metadata: {},
  phone: null,
  provider: "zapi",
  status: "active",
  storeId,
  tenantId,
  webhookUrl: null,
};
