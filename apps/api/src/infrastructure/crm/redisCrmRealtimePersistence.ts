import { randomUUID } from "node:crypto";
import type {
  CrmRealtimeBroker,
  CrmRealtimeEvent,
  CrmRealtimeEventEnvelope,
  CrmRealtimeReplayInput,
  CrmRealtimeTicket,
} from "../../domains/crm/ports/crmRealtimePublisher.js";

const channel = "crm:whatsapp:realtime";
const streamKeyPrefix = "crm:whatsapp:realtime:stream:";
const streamMaxEvents = 2_000;
const ticketKeyPrefix = "crm:whatsapp:sse-ticket:";
const ticketTtlSeconds = 60;

type RedisCommandClient = {
  publish(channel: string, message: string): Promise<unknown>;
  sendCommand(args: string[]): Promise<unknown>;
  set(key: string, value: string, options: { EX: number }): Promise<unknown>;
};

export function createRedisCrmRealtimePersistence(
  client: RedisCommandClient,
  ensureReady: () => Promise<void>,
) {
  return {
    async appendEvent(event: CrmRealtimeEvent) {
      const createdAt = new Date().toISOString();
      await ensureReady();
      const storedId = await client.sendCommand([
        "XADD",
        streamKey(event.tenantId, event.storeId),
        "MAXLEN",
        "~",
        String(streamMaxEvents),
        "*",
        "event",
        JSON.stringify({ createdAt, event }),
      ]);
      if (typeof storedId !== "string") {
        throw new Error(
          "Redis CRM realtime stream returned an invalid event id.",
        );
      }
      return { createdAt, event, id: storedId };
    },
    async issueTicket(input: Parameters<CrmRealtimeBroker["issueTicket"]>[0]) {
      const ticket: CrmRealtimeTicket = {
        ...input,
        expiresAt: new Date(Date.now() + ticketTtlSeconds * 1_000),
        ticket: randomUUID(),
      };
      await ensureReady();
      await client.set(ticketKey(ticket.ticket), serializeTicket(ticket), {
        EX: ticketTtlSeconds,
      });
      return ticket;
    },
    async publishEnvelope(envelope: CrmRealtimeEventEnvelope) {
      await ensureReady();
      await client.publish(channel, JSON.stringify(envelope));
    },
    async replay(input: CrmRealtimeReplayInput) {
      if (!input.sinceEventId) return [];
      const limit = input.limit ?? 250;
      if (limit <= 0) return [];
      await ensureReady();
      const replay: CrmRealtimeEventEnvelope[] = [];
      let cursor = input.sinceEventId;
      while (replay.length < limit) {
        const rows = await client.sendCommand([
          "XRANGE",
          streamKey(input.tenantId, input.storeId),
          `(${cursor}`,
          "+",
          "COUNT",
          String(limit),
        ]);
        const parsed = parseStreamRows(rows);
        replay.push(
          ...parsed
            .filter((item) => matchesReplayScope(input, item.event))
            .slice(0, limit - replay.length),
        );
        const nextCursor = lastStreamId(rows);
        if (
          streamRowCount(rows) < limit ||
          !nextCursor ||
          nextCursor === cursor
        )
          break;
        cursor = nextCursor;
      }
      return replay;
    },
    async resolveTicket(ticket: string) {
      await ensureReady();
      const stored = await client.sendCommand(["GETDEL", ticketKey(ticket)]);
      return typeof stored === "string" ? parseTicket(stored) : null;
    },
  };
}

export function parseRedisRealtimeEnvelope(value: string) {
  try {
    return JSON.parse(value) as CrmRealtimeEventEnvelope;
  } catch {
    return null;
  }
}

export const redisCrmRealtimeChannel = channel;

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

function streamRowCount(value: unknown) {
  return isUnknownArray(value) ? value.length : 0;
}

function lastStreamId(value: unknown) {
  if (!isUnknownArray(value)) return null;
  const row = value.at(-1);
  return isUnknownArray(row) && typeof row[0] === "string" ? row[0] : null;
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

function matchesReplayScope(
  input: CrmRealtimeReplayInput,
  event: CrmRealtimeEvent,
) {
  if (input.storeId !== event.storeId) return false;
  if (input.tenantId !== event.tenantId) return false;
  if (!input.connectionId) return true;
  return input.connectionId === event.connectionId;
}
