import {
  crmConversationCycleSchema,
  crmMessageSchema,
  crmMessageStatuses,
} from "@lojaveiculosv2/shared";
import type {
  CrmConnectionId,
  CrmEventsTicket,
  CrmRealtimeEvent,
  CrmRealtimeStatus,
} from "./crmConversationTypes";
import { readCrmSseStream } from "./crmSseParser";

type JsonBody = Record<string, unknown>;

const crmSseEventNames = [
  "connected",
  "connection_status",
  "conversationCycle",
  "message",
  "message_status",
  "presence",
] as const;

export function subscribeCrmEvents(input: {
  connectionId?: CrmConnectionId | null | undefined;
  eventsRoute: string;
  eventsTicketRoute: string;
  fetch: typeof fetch;
  headers?: HeadersInit | undefined;
  onError?: ((error: Error) => void) | undefined;
  onEvent: (event: CrmRealtimeEvent) => void;
  onStatus?: (status: CrmRealtimeStatus) => void;
  postJson: <T>(route: string, body?: JsonBody) => Promise<T>;
}) {
  let closed = false;
  let streamController: AbortController | null = null;
  let lastEventId: string | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let stableConnectionTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;
  let connectGeneration = 0;
  const seenEventIds = new Set<string>();

  const closeStream = () => {
    streamController?.abort();
    streamController = null;
  };

  const clearReconnect = () => {
    if (reconnectTimer) globalThis.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };

  const clearStableConnectionTimer = () => {
    if (stableConnectionTimer) globalThis.clearTimeout(stableConnectionTimer);
    stableConnectionTimer = null;
  };

  const scheduleReconnect = () => {
    clearStableConnectionTimer();
    closeStream();
    if (reconnectTimer || closed) return;
    input.onStatus?.("degraded");
    reconnectAttempts += 1;
    const delay = Math.min(1_000 * 2 ** (reconnectAttempts - 1), 15_000);
    reconnectTimer = globalThis.setTimeout(() => {
      reconnectTimer = null;
      void connect().catch((error) => {
        if (isAbortError(error)) return;
        input.onError?.(normalizeRealtimeError(error));
        scheduleReconnect();
      });
    }, delay);
  };

  const connect = async () => {
    const generation = ++connectGeneration;
    input.onStatus?.("connecting");
    clearReconnect();
    closeStream();
    const ticket = await input.postJson<CrmEventsTicket>(
      input.eventsTicketRoute,
      {
        connectionId: input.connectionId ?? undefined,
        lastEventId: lastEventId ?? undefined,
      },
    );
    if (closed || generation !== connectGeneration) return;
    const controller = new AbortController();
    streamController = controller;
    const response = await input.fetch(input.eventsRoute, {
      headers: createSseHeaders(input.headers, ticket.ticket),
      method: "GET",
      signal: controller.signal,
    });
    if (closed || generation !== connectGeneration) {
      controller.abort();
      return;
    }
    if (!response.ok) {
      throw new Error(
        `CRM realtime stream failed with HTTP ${response.status}.`,
      );
    }
    if (!response.body) throw new Error("CRM realtime stream has no body.");

    clearStableConnectionTimer();
    stableConnectionTimer = globalThis.setTimeout(() => {
      if (streamController !== controller || closed) return;
      reconnectAttempts = 0;
      stableConnectionTimer = null;
    }, 5_000);
    input.onStatus?.("connected");

    await readCrmSseStream(response.body, (frame) => {
      if (closed || streamController !== controller) return;
      if (!isCrmSseEventName(frame.event)) return;
      try {
        const parsedEvent = parseRealtimeEvent(JSON.parse(frame.data));
        if (frame.id) {
          if (seenEventIds.has(frame.id)) return;
        }
        input.onEvent(parsedEvent);
        if (frame.id) {
          seenEventIds.add(frame.id);
          trimSeenEventIds(seenEventIds);
          lastEventId = frame.id;
        }
      } catch {
        throw invalidRealtimeEvent();
      }
    });
    if (!closed && generation === connectGeneration) {
      throw new Error("CRM realtime stream ended.");
    }
  };

  void connect().catch((error) => {
    if (isAbortError(error)) return;
    input.onError?.(normalizeRealtimeError(error));
    scheduleReconnect();
  });

  return () => {
    closed = true;
    connectGeneration += 1;
    input.onStatus?.("offline");
    clearReconnect();
    clearStableConnectionTimer();
    closeStream();
  };
}

function parseRealtimeEvent(value: unknown): CrmRealtimeEvent {
  const event = readRecord(value);
  if (event.type === "connected") return { type: "connected" };
  if (event.type === "message") {
    const { conversationCycle, ...messageEvent } = event;
    return Object.assign({}, messageEvent, {
      connectionId: readString(event.connectionId),
      message: crmMessageSchema.parse(event.message),
      cycle: crmConversationCycleSchema.parse(conversationCycle),
    }) as CrmRealtimeEvent;
  }
  if (event.type === "conversationCycle") {
    const { conversationCycle, ...cycleEvent } = event;
    return Object.assign({}, cycleEvent, {
      connectionId: readString(event.connectionId),
      cycle: crmConversationCycleSchema.parse(conversationCycle),
      type: "cycle",
    }) as CrmRealtimeEvent;
  }
  if (event.type === "connection_status") {
    return {
      connectionId: readString(event.connectionId),
      phone: readNullableString(event.phone),
      status: readString(event.status),
      type: event.type,
    };
  }
  if (event.type === "message_status") {
    const rawStatus = readString(event.status);
    const status = crmMessageStatuses.find(
      (candidate) => candidate === rawStatus,
    );
    if (!status) throw invalidRealtimeEvent();
    return {
      connectionId: readString(event.connectionId),
      cycleId: readString(event.cycleId),
      ...(event.lastCustomerReadAt === undefined
        ? {}
        : { lastCustomerReadAt: readString(event.lastCustomerReadAt) }),
      messageId: readString(event.messageId),
      status,
      type: event.type,
    };
  }
  if (event.type === "presence") {
    return {
      connectionId: readString(event.connectionId),
      cycleId: readString(event.cycleId),
      payload: readRecord(event.payload),
      type: event.type,
    };
  }
  throw invalidRealtimeEvent();
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalidRealtimeEvent();
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown) {
  if (typeof value !== "string" || !value.trim()) throw invalidRealtimeEvent();
  return value;
}

function readNullableString(value: unknown) {
  return value === null ? null : readString(value);
}

function invalidRealtimeEvent() {
  return new Error("Invalid CRM WhatsApp realtime event.");
}

function trimSeenEventIds(seenEventIds: Set<string>) {
  if (seenEventIds.size <= 500) return;
  const first = seenEventIds.values().next().value;
  if (first) seenEventIds.delete(first);
}

function createSseHeaders(headers: HeadersInit | undefined, ticket: string) {
  const result = new Headers(headers);
  result.set("Accept", "text/event-stream");
  result.set("X-CRM-SSE-Ticket", ticket);
  return result;
}

function isCrmSseEventName(value: string) {
  return crmSseEventNames.some((eventName) => eventName === value);
}

function normalizeRealtimeError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
