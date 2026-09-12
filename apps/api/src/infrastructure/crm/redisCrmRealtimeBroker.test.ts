import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  CrmRealtimeEvent,
  CrmRealtimeEventEnvelope,
} from "../../domains/crm/ports/crmRealtimePublisher.js";
import {
  createRedisClient,
  installRedisClients,
} from "./redisCrmRealtimeBroker.testSupport.js";

const redisMocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("redis", () => ({ createClient: redisMocks.createClient }));

import {
  CrmRealtimeConfigurationError,
  createRedisCrmRealtimeBroker,
  createRuntimeCrmRealtimeBroker,
} from "./redisCrmRealtimeBroker.js";

const storeId = "store-1" as StoreId;
const tenantId = "tenant-1" as TenantId;

function createEvent(connectionId = "connection-1"): CrmRealtimeEvent {
  return {
    connectionId,
    phone: null,
    status: "active",
    storeId,
    tenantId,
    type: "connection_status",
  };
}

describe("createRedisCrmRealtimeBroker", () => {
  beforeEach(() => redisMocks.createClient.mockReset());

  it("surfaces command failures and allows a later connection attempt", async () => {
    const { command } = installRedisClients(redisMocks.createClient);
    command.connect
      .mockRejectedValueOnce(new Error("redis unavailable"))
      .mockImplementationOnce(async () => {
        command.isOpen = true;
        command.isReady = true;
        command.emit("ready");
      });
    const broker = createRedisCrmRealtimeBroker("redis://recovering");

    await expect(
      broker.issueTicket({
        queueVisibility: { kind: "global" },
        storeId,
        tenantId,
      }),
    ).rejects.toThrow("redis unavailable");
    await expect(
      broker.issueTicket({
        queueVisibility: { kind: "global" },
        storeId,
        tenantId,
      }),
    ).resolves.toMatchObject({ storeId, tenantId });
    expect(command.connect).toHaveBeenCalledTimes(2);
  });

  it("allows subscriber setup to recover after a transient failure", async () => {
    const { subscriber } = installRedisClients(redisMocks.createClient);
    subscriber.subscribe
      .mockRejectedValueOnce(new Error("subscriber unavailable"))
      .mockResolvedValueOnce(undefined);
    const broker = createRedisCrmRealtimeBroker("redis://recovering");

    await expect(broker.ready()).rejects.toThrow("subscriber unavailable");
    await expect(broker.ready()).resolves.toBeUndefined();
    expect(subscriber.subscribe).toHaveBeenCalledTimes(2);
  });

  it("does not deliver process-local events when Redis publish fails", async () => {
    installRedisClients(redisMocks.createClient, {
      publish: vi.fn(async () => {
        throw new Error("redis publish failed");
      }),
    });
    const broker = createRedisCrmRealtimeBroker("redis://runtime-failure");
    const onEvent = vi.fn();
    broker.subscribe({
      onEvent,
      queueVisibility: { kind: "global" },
      storeId,
      tenantId,
    });

    await expect(broker.publish(createEvent())).rejects.toThrow(
      "redis publish failed",
    );
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("atomically consumes a realtime ticket once", async () => {
    const { command } = installRedisClients(redisMocks.createClient);
    let storedTicket: string | null = null;
    command.set.mockImplementation(async (_key, value) => {
      storedTicket = String(value);
      return "OK";
    });
    command.sendCommand.mockImplementation(async ([operation]) => {
      if (operation !== "GETDEL") return "1-0";
      const consumed = storedTicket;
      storedTicket = null;
      return consumed;
    });
    const broker = createRedisCrmRealtimeBroker("redis://available");
    const issued = await broker.issueTicket({
      queueVisibility: { kind: "global" },
      storeId,
      tenantId,
    });

    await expect(broker.resolveTicket(issued.ticket)).resolves.toMatchObject({
      storeId,
      tenantId,
    });
    await expect(broker.resolveTicket(issued.ticket)).resolves.toBeNull();
    expect(command.sendCommand.mock.calls.map(([args]) => args[0])).toEqual([
      "GETDEL",
      "GETDEL",
    ]);
  });

  it("uses channel-neutral Redis namespaces for shared CRM realtime state", async () => {
    const { command, subscriber } = installRedisClients(
      redisMocks.createClient,
    );
    const broker = createRedisCrmRealtimeBroker("redis://available");

    await broker.issueTicket({
      queueVisibility: { kind: "global" },
      storeId,
      tenantId,
    });
    await broker.ready();
    await broker.publish(createEvent());

    expect(command.set).toHaveBeenCalledWith(
      expect.stringMatching(/^crm:sse-ticket:/),
      expect.any(String),
      { EX: 60 },
    );
    expect(command.sendCommand).toHaveBeenCalledWith(
      expect.arrayContaining([
        "XADD",
        `crm:realtime:stream:${tenantId}:${storeId}`,
      ]),
    );
    expect(command.publish).toHaveBeenCalledWith(
      "crm:realtime",
      expect.any(String),
    );
    expect(subscriber.subscribe).toHaveBeenCalledWith(
      "crm:realtime",
      expect.any(Function),
    );
  });

  it("delivers published events to subscribers on separate brokers", async () => {
    const listeners: Array<(message: string) => void> = [];
    const createSharedClient = () => {
      const subscriber = createRedisClient();
      subscriber.subscribe.mockImplementation(async (_channel, listener) => {
        listeners.push(listener);
      });
      const command = createRedisClient();
      command.duplicate.mockReturnValue(subscriber);
      command.publish.mockImplementation(async (_channel, message) => {
        for (const listener of listeners) listener(message);
        return listeners.length;
      });
      return command;
    };
    redisMocks.createClient
      .mockReturnValueOnce(createSharedClient())
      .mockReturnValueOnce(createSharedClient());
    const firstBroker = createRedisCrmRealtimeBroker("redis://available");
    const secondBroker = createRedisCrmRealtimeBroker("redis://available");
    const onEvent = vi.fn<(event: CrmRealtimeEventEnvelope) => void>();
    secondBroker.subscribe({
      onEvent,
      queueVisibility: { kind: "global" },
      storeId,
      tenantId,
    });

    await Promise.all([firstBroker.ready(), secondBroker.ready()]);
    await firstBroker.publish(createEvent());

    expect(onEvent).toHaveBeenCalledOnce();
    expect(onEvent.mock.calls[0]?.[0].id).toBe("1-0");
  });
});

describe("createRuntimeCrmRealtimeBroker", () => {
  beforeEach(() => redisMocks.createClient.mockReset());

  it("fails configuration outside local/test when REDIS_URL is absent", () => {
    expect(() =>
      createRuntimeCrmRealtimeBroker({
        APP_ENV: "staging",
        NODE_ENV: "production",
      }),
    ).toThrow(CrmRealtimeConfigurationError);
  });

  it("uses explicit in-memory mode for local/test", async () => {
    const broker = createRuntimeCrmRealtimeBroker({ APP_ENV: "local" });
    const onEvent = vi.fn();
    broker.subscribe({
      onEvent,
      queueVisibility: { kind: "global" },
      storeId,
      tenantId,
    });

    await broker.ready();
    await broker.publish(createEvent());
    await broker.close();

    expect(onEvent).toHaveBeenCalledOnce();
    expect(redisMocks.createClient).not.toHaveBeenCalled();
  });
});
