import { EventEmitter } from "node:events";
import { vi } from "vitest";
import type { Mock } from "vitest";
import type { CrmRealtimeEvent } from "../../domains/crm/ports/crmRealtimePublisher.js";

export type FakeRedisClient = EventEmitter & {
  close: Mock<() => Promise<void>>;
  connect: Mock<() => Promise<void>>;
  destroy: Mock<() => void>;
  duplicate: Mock<() => FakeRedisClient>;
  get: Mock<() => Promise<string | null>>;
  isOpen: boolean;
  isReady: boolean;
  publish: Mock<(channel: string, message: string) => Promise<number>>;
  sendCommand: Mock<(args: string[]) => Promise<unknown>>;
  set: Mock<(...args: unknown[]) => Promise<string>>;
  subscribe: Mock<
    (channel: string, listener: (message: string) => void) => Promise<void>
  >;
};

export function createRedisClient(): FakeRedisClient {
  const client = Object.assign(new EventEmitter(), {
    close: vi.fn<() => Promise<void>>(async () => undefined),
    connect: vi.fn<() => Promise<void>>(async () => {
      client.isOpen = true;
      client.isReady = true;
      client.emit("ready");
    }),
    destroy: vi.fn<() => void>(() => {
      if (!client.isOpen) return;
      client.isOpen = false;
      client.isReady = false;
      client.emit("end");
    }),
    duplicate: vi.fn<() => FakeRedisClient>(),
    get: vi.fn<() => Promise<string | null>>(async () => null),
    isOpen: false,
    isReady: false,
    publish: vi.fn<(channel: string, message: string) => Promise<number>>(
      async () => 1,
    ),
    sendCommand: vi.fn<(args: string[]) => Promise<unknown>>(async () => "1-0"),
    set: vi.fn<(...args: unknown[]) => Promise<string>>(async () => "OK"),
    subscribe: vi.fn<
      (channel: string, listener: (message: string) => void) => Promise<void>
    >(
      async (_channel: string, _listener: (message: string) => void) =>
        undefined,
    ),
  });
  return client;
}

export function installRedisClients(
  createClientMock: ReturnType<typeof vi.fn>,
  commandOverrides: Partial<FakeRedisClient> = {},
  subscriberOverrides: Partial<FakeRedisClient> = {},
) {
  const subscriber = Object.assign(createRedisClient(), subscriberOverrides);
  const command = Object.assign(createRedisClient(), commandOverrides);
  command.duplicate.mockReturnValue(subscriber);
  createClientMock.mockReturnValue(command);
  return { command, subscriber };
}

export function streamRow(id: string, event: CrmRealtimeEvent) {
  return [
    id,
    ["event", JSON.stringify({ createdAt: new Date(0).toISOString(), event })],
  ];
}
