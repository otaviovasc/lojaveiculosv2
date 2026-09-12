import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import {
  installRedisClients,
  type FakeRedisClient,
} from "./redisCrmRealtimeBroker.testSupport.js";

const redisMocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("redis", () => ({ createClient: redisMocks.createClient }));

import { createRedisCrmRealtimeBroker } from "./redisCrmRealtimeBroker.js";

const storeId = "store-1" as StoreId;
const tenantId = "tenant-1" as TenantId;

describe("Redis CRM realtime client lifecycle", () => {
  beforeEach(() => redisMocks.createClient.mockReset());

  it("handles error events and reconnects both clients after lifecycle resets", async () => {
    const { command, subscriber } = installRedisClients(
      redisMocks.createClient,
    );
    const broker = createRedisCrmRealtimeBroker("redis://recovering");
    await broker.ready();

    expect(() => command.emit("error", new Error("transient"))).not.toThrow();
    expect(() =>
      subscriber.emit("error", new Error("transient")),
    ).not.toThrow();

    markReconnecting(command);
    markReconnecting(subscriber);
    const recovery = broker.ready();
    command.isReady = true;
    subscriber.isReady = true;
    command.emit("ready");
    subscriber.emit("ready");
    await recovery;

    expect(subscriber.subscribe).toHaveBeenCalledTimes(2);

    markEnded(command);
    markEnded(subscriber);
    await broker.ready();

    expect(command.connect).toHaveBeenCalledTimes(2);
    expect(subscriber.connect).toHaveBeenCalledTimes(2);
    expect(subscriber.subscribe).toHaveBeenCalledTimes(3);
  });

  it("destroys pending connects and cannot reconnect after close", async () => {
    const { command, subscriber } = installRedisClients(
      redisMocks.createClient,
    );
    let rejectConnect: ((error: Error) => void) | undefined;
    command.connect.mockImplementation(() => {
      command.isOpen = true;
      return new Promise<void>((_resolve, reject) => {
        rejectConnect = reject;
      });
    });
    command.destroy.mockImplementation(() => {
      command.isOpen = false;
      command.isReady = false;
      rejectConnect?.(new Error("connect cancelled"));
      command.emit("end");
    });
    const broker = createRedisCrmRealtimeBroker("redis://pending");
    const readiness = expect(broker.ready()).rejects.toThrow();
    await Promise.resolve();

    await broker.close();
    await readiness;
    subscriber.emit("reconnecting");

    await expect(broker.ready()).rejects.toThrow("closed");
    await expect(broker.close()).resolves.toBeUndefined();
    expect(command.destroy).toHaveBeenCalledOnce();
    expect(subscriber.destroy).toHaveBeenCalledOnce();
    expect(command.connect).toHaveBeenCalledOnce();
    expect(subscriber.connect).toHaveBeenCalledOnce();
  });
});

function markReconnecting(client: FakeRedisClient) {
  client.isOpen = true;
  client.isReady = false;
  client.emit("reconnecting");
}

function markEnded(client: FakeRedisClient) {
  client.isOpen = false;
  client.isReady = false;
  client.emit("end");
}
