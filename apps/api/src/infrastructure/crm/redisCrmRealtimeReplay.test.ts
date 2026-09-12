import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmRealtimeEvent } from "../../domains/crm/ports/crmRealtimePublisher.js";
import { createTestCrmConversationCycle } from "../../domains/crm/testSupportWhatsapp.js";
import {
  installRedisClients,
  streamRow,
} from "./redisCrmRealtimeBroker.testSupport.js";

const redisMocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("redis", () => ({ createClient: redisMocks.createClient }));

import { createRedisCrmRealtimeBroker } from "./redisCrmRealtimeBroker.js";

const storeId = "store-1" as StoreId;
const tenantId = "tenant-1" as TenantId;
const actorUserId = "02020202-0202-4202-8202-020202020202" as UserId;
const otherUserId = "03030303-0303-4303-8303-030303030303" as UserId;

describe("Redis CRM realtime replay", () => {
  beforeEach(() => redisMocks.createClient.mockReset());

  it("pages raw rows until connection-scoped replay reaches its limit", async () => {
    const { command } = installRedisClients(redisMocks.createClient);
    const rowsByCursor = new Map([
      ["-", streamRow("1-0", connectionEvent("other"))],
      ["(1-0", streamRow("2-0", connectionEvent("target"))],
      ["(2-0", streamRow("3-0", connectionEvent("other"))],
      ["(3-0", streamRow("4-0", connectionEvent("target"))],
    ]);
    command.sendCommand.mockImplementation(async (args) => {
      const row = rowsByCursor.get(args[2] ?? "");
      return row ? [row] : [];
    });
    const broker = createRedisCrmRealtimeBroker("redis://available");

    const first = await broker.replay({
      connectionId: "target",
      limit: 1,
      queueVisibility: { kind: "global" },
      sinceEventId: "0-0",
      storeId,
      tenantId,
    });
    const second = await broker.replay({
      connectionId: "target",
      limit: 1,
      queueVisibility: { kind: "global" },
      sinceEventId: first[0]?.id ?? null,
      storeId,
      tenantId,
    });

    expect(first.map(({ id }) => id)).toEqual(["2-0"]);
    expect(second.map(({ id }) => id)).toEqual(["4-0"]);
    expect(command.sendCommand.mock.calls.map(([args]) => args[2])).toEqual([
      "-",
      "(1-0",
      "(2-0",
      "(3-0",
      "(4-0",
      "-",
      "(1-0",
      "(2-0",
      "(3-0",
      "(4-0",
    ]);
  });

  it("returns the tombstone instead of stale ownership", async () => {
    const { command } = installRedisClients(redisMocks.createClient);
    command.sendCommand.mockResolvedValueOnce([
      streamRow("1-0", sessionEvent(actorUserId, 1)),
      streamRow("2-0", sessionEvent(otherUserId, 2, actorUserId)),
    ]);
    const broker = createRedisCrmRealtimeBroker("redis://available");

    const replay = await broker.replay({
      limit: 1,
      queueVisibility: { kind: "assigned", userId: actorUserId },
      sinceEventId: "0-0",
      storeId,
      tenantId,
    });

    expect(replay).toHaveLength(1);
    expect(replay[0]).toMatchObject({
      id: "2-0",
      event: {
        revokedUserId: actorUserId,
        conversationCycle: { assignedUserId: otherUserId },
      },
    });
  });

  it("does not reveal retained events from before assignment to the user", async () => {
    const { command } = installRedisClients(redisMocks.createClient);
    command.sendCommand.mockResolvedValueOnce([
      streamRow("1-0", sessionEvent(otherUserId, 1)),
      streamRow("2-0", sessionEvent(actorUserId, 2)),
    ]);
    const broker = createRedisCrmRealtimeBroker("redis://available");

    const replay = await broker.replay({
      queueVisibility: { kind: "assigned", userId: actorUserId },
      sinceEventId: "0-0",
      storeId,
      tenantId,
    });

    expect(replay).toHaveLength(1);
    expect(replay[0]).toMatchObject({
      id: "2-0",
      event: {
        conversationCycle: { assignedUserId: actorUserId, revision: 2 },
      },
    });
  });

  it("drops retained assignment events that arrive out of revision order", async () => {
    const { command } = installRedisClients(redisMocks.createClient);
    command.sendCommand.mockResolvedValueOnce([
      streamRow("1-0", sessionEvent(actorUserId, 2)),
      streamRow("2-0", sessionEvent(otherUserId, 1)),
    ]);
    const broker = createRedisCrmRealtimeBroker("redis://available");

    const replay = await broker.replay({
      queueVisibility: { kind: "assigned", userId: actorUserId },
      sinceEventId: "0-0",
      storeId,
      tenantId,
    });

    expect(replay).toHaveLength(1);
    expect(replay[0]).toMatchObject({
      id: "1-0",
      event: {
        conversationCycle: { assignedUserId: actorUserId, revision: 2 },
      },
    });
  });
});

function connectionEvent(connectionId: string): CrmRealtimeEvent {
  return {
    connectionId,
    phone: null,
    status: "active",
    storeId,
    tenantId,
    type: "connection_status",
  };
}

function sessionEvent(
  assignedUserId: UserId,
  revision: number,
  revokedUserId?: UserId,
): CrmRealtimeEvent {
  return {
    connectionId: connection.id,
    ...(revokedUserId ? { revokedUserId } : {}),
    conversationCycle: createTestCrmConversationCycle({
      assignedUserId,
      connectionId: connection.id,
      id: "conversationCycle-1",
      revision,
      storeId,
      tenantId,
    }),
    storeId,
    tenantId,
    type: "conversationCycle",
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
