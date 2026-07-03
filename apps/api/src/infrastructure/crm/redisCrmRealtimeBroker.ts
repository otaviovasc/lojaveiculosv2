import { randomUUID } from "node:crypto";
import { createClient } from "redis";
import type {
  CrmRealtimeBroker,
  CrmRealtimeEvent,
  CrmRealtimeEventEnvelope,
  CrmRealtimeReplayInput,
  CrmRealtimeSubscription,
  CrmRealtimeTicket,
} from "../../domains/crm/ports/crmRealtimePublisher.js";
import { createCrmRealtimeBroker } from "./crmRealtimeBroker.js";

const channel = "crm:whatsapp:realtime";
const streamKeyPrefix = "crm:whatsapp:realtime:stream:";
const streamMaxEvents = 2_000;
const ticketKeyPrefix = "crm:whatsapp:sse-ticket:";
const ticketTtlSeconds = 60;

export type ClosableCrmRealtimeBroker = CrmRealtimeBroker & {
  close: () => Promise<void>;
};

export function createRedisCrmRealtimeBroker(
  redisUrl: string,
): ClosableCrmRealtimeBroker {
  const local = createCrmRealtimeBroker();
  const originId = randomUUID();
  const commandClient = createClient({ url: redisUrl });
  const subscriberClient = commandClient.duplicate();
  let commandConnect: Promise<unknown> | null = null;
  let subscriberConnect: Promise<unknown> | null = null;
  let subscribed = false;

  return {
    async close() {
      await Promise.allSettled([
        commandClient.isOpen ? commandClient.quit() : undefined,
        subscriberClient.isOpen ? subscriberClient.quit() : undefined,
      ]);
    },
    async issueTicket(input) {
      const ticket = await local.issueTicket(input);
      await withRedis(async () => {
        await ensureCommandClient();
        return commandClient.set(
          ticketKey(ticket.ticket),
          serializeTicket(ticket),
          {
            EX: ticketTtlSeconds,
          },
        );
      });
      return ticket;
    },
    async publish(event) {
      const envelope = (await appendRedisEvent(event)) ?? createEnvelope(event);
      await local.publishEnvelope(envelope);
      await publishRedisEnvelope(envelope);
    },
    async replay(input) {
      const replay = await replayRedisEvents(input);
      return replay ?? local.replay(input);
    },
    async resolveTicket(ticket) {
      const localTicket = await local.resolveTicket(ticket);
      if (localTicket) return localTicket;
      const stored = await withRedis(async () => {
        await ensureCommandClient();
        return commandClient.get(ticketKey(ticket));
      });
      return typeof stored === "string" ? parseTicket(stored) : null;
    },
    subscribe(subscription) {
      const unsubscribe = local.subscribe(subscription);
      void ensureSubscriber();
      return unsubscribe;
    },
  };

  async function ensureCommandClient() {
    if (commandClient.isOpen) return;
    commandConnect ??= commandClient.connect();
    await commandConnect;
  }

  async function ensureSubscriber() {
    if (subscribed) return;
    if (!subscriberClient.isOpen) {
      subscriberConnect ??= subscriberClient.connect();
      await subscriberConnect;
    }
    await subscriberClient.subscribe(channel, (message) => {
      const envelope = parseEnvelope(message);
      if (!envelope || envelope.originId === originId) return;
      void local.publishEnvelope(envelope.envelope);
    });
    subscribed = true;
  }

  async function appendRedisEvent(event: CrmRealtimeEvent) {
    const createdAt = new Date().toISOString();
    const storedId = await withRedis(async () => {
      await ensureCommandClient();
      return commandClient.sendCommand([
        "XADD",
        streamKey(event.tenantId, event.storeId),
        "MAXLEN",
        "~",
        String(streamMaxEvents),
        "*",
        "event",
        JSON.stringify({ createdAt, event }),
      ]);
    });
    return typeof storedId === "string"
      ? { createdAt, event, id: storedId }
      : null;
  }

  async function replayRedisEvents(input: CrmRealtimeReplayInput) {
    if (!input.sinceEventId) return [];
    const rows = await withRedis(async () => {
      await ensureCommandClient();
      return commandClient.sendCommand([
        "XRANGE",
        streamKey(input.tenantId, input.storeId),
        `(${input.sinceEventId}`,
        "+",
        "COUNT",
        String(input.limit ?? 250),
      ]);
    });
    if (!rows) return null;
    return parseStreamRows(rows).filter((envelope) =>
      matchesReplayScope(input, envelope.event),
    );
  }

  async function publishRedisEnvelope(envelope: CrmRealtimeEventEnvelope) {
    await withRedis(async () => {
      await ensureCommandClient();
      await commandClient.publish(
        channel,
        JSON.stringify({ envelope, originId }),
      );
    });
  }

  async function withRedis<T>(action: () => Promise<T>) {
    try {
      return await action();
    } catch {
      return null;
    }
  }
}

function streamKey(tenantId: string, storeId: string) {
  return `${streamKeyPrefix}${tenantId}:${storeId}`;
}

function ticketKey(ticket: string) {
  return `${ticketKeyPrefix}${ticket}`;
}

function serializeTicket(ticket: CrmRealtimeTicket) {
  return JSON.stringify({
    ...ticket,
    expiresAt: ticket.expiresAt.toISOString(),
  });
}

function parseTicket(value: string): CrmRealtimeTicket | null {
  try {
    const parsed = JSON.parse(value) as Omit<CrmRealtimeTicket, "expiresAt"> & {
      expiresAt: string;
    };
    const expiresAt = new Date(parsed.expiresAt);
    if (expiresAt.getTime() <= Date.now()) return null;
    return { ...parsed, expiresAt };
  } catch {
    return null;
  }
}

function parseEnvelope(value: string) {
  try {
    return JSON.parse(value) as {
      envelope: CrmRealtimeEventEnvelope;
      originId: string;
    };
  } catch {
    return null;
  }
}

function parseStreamRows(value: unknown): CrmRealtimeEventEnvelope[] {
  if (!isUnknownArray(value)) return [];
  return value.flatMap((row) => {
    if (!isUnknownArray(row) || typeof row[0] !== "string") return [];
    const fields: unknown = row[1];
    if (!isUnknownArray(fields)) return [];
    const eventIndex = fields.findIndex((field) => field === "event");
    if (eventIndex < 0) return [];
    const parsed = parseStreamEvent(fields[eventIndex + 1]);
    return parsed ? [{ ...parsed, id: row[0] }] : [];
  });
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function parseStreamEvent(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as Omit<CrmRealtimeEventEnvelope, "id">;
  } catch {
    return null;
  }
}

function createEnvelope(event: CrmRealtimeEvent): CrmRealtimeEventEnvelope {
  return {
    createdAt: new Date().toISOString(),
    event,
    id: `${Date.now()}-${randomUUID()}`,
  };
}

function matchesReplayScope(
  input: CrmRealtimeReplayInput,
  event: CrmRealtimeEvent,
) {
  if (input.storeId !== event.storeId) return false;
  if (input.tenantId !== event.tenantId) return false;
  if (!input.connectionId) return true;
  return input.connectionId === event.connectionId;
}

export function createRuntimeCrmRealtimeBroker(
  env: Record<string, string | undefined>,
) {
  const redisUrl = env.REDIS_URL?.trim();
  return redisUrl
    ? createRedisCrmRealtimeBroker(redisUrl)
    : createCrmRealtimeBroker();
}
