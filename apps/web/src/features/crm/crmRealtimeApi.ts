import {
  crmConversationCycleSchema,
  crmMessageSchema,
} from "@lojaveiculosv2/shared";
import type {
  CrmConnectionId,
  CrmEventsTicket,
  CrmRealtimeEvent,
  CrmRealtimeStatus,
} from "./crmConversationTypes";

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
  onError?: ((error: Error) => void) | undefined;
  onEvent: (event: CrmRealtimeEvent) => void;
  onStatus?: (status: CrmRealtimeStatus) => void;
  postJson: <T>(route: string, body?: JsonBody) => Promise<T>;
}) {
  let closed = false;
  let eventSource: EventSource | null = null;
  let lastEventId: string | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let stableConnectionTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;
  let connectGeneration = 0;
  const seenEventIds = new Set<string>();

  const closeEventSource = () => {
    eventSource?.close();
    eventSource = null;
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
    closeEventSource();
    if (reconnectTimer || closed) return;
    input.onStatus?.("degraded");
    reconnectAttempts += 1;
    const delay = Math.min(1_000 * 2 ** (reconnectAttempts - 1), 15_000);
    reconnectTimer = globalThis.setTimeout(() => {
      reconnectTimer = null;
      void connect().catch((error) => {
        input.onError?.(asError(error));
        scheduleReconnect();
      });
    }, delay);
  };

  const connect = async () => {
    const generation = ++connectGeneration;
    input.onStatus?.("connecting");
    clearReconnect();
    closeEventSource();
    const ticket = await input.postJson<CrmEventsTicket>(
      input.eventsTicketRoute,
      {
        connectionId: input.connectionId ?? undefined,
        lastEventId: lastEventId ?? undefined,
      },
    );
    if (closed || generation !== connectGeneration) return;
    const source = new EventSource(
      withTicket(input.eventsRoute, ticket.ticket),
    );
    eventSource = source;
    source.onopen = () => {
      if (closed || eventSource !== source) return;
      clearStableConnectionTimer();
      stableConnectionTimer = globalThis.setTimeout(() => {
        if (eventSource !== source || closed) return;
        reconnectAttempts = 0;
        stableConnectionTimer = null;
      }, 5_000);
      input.onStatus?.("connected");
    };
    const handleMessage = (event: MessageEvent) => {
      if (closed || eventSource !== source) return;
      try {
        if (event.lastEventId) {
          if (seenEventIds.has(event.lastEventId)) return;
          seenEventIds.add(event.lastEventId);
          trimSeenEventIds(seenEventIds);
          lastEventId = event.lastEventId;
        }
        input.onEvent(parseRealtimeEvent(JSON.parse(event.data)));
      } catch {
        input.onError?.(new Error("Invalid CRM WhatsApp realtime event."));
        scheduleReconnect();
      }
    };
    crmSseEventNames.forEach((eventName) => {
      source.addEventListener(eventName, handleMessage as EventListener);
    });
    source.onerror = () => {
      if (closed || eventSource !== source) return;
      scheduleReconnect();
    };
  };

  void connect().catch((error) => {
    input.onError?.(asError(error));
    scheduleReconnect();
  });

  return () => {
    closed = true;
    connectGeneration += 1;
    input.onStatus?.("offline");
    clearReconnect();
    clearStableConnectionTimer();
    closeEventSource();
  };
}

function parseRealtimeEvent(value: unknown): CrmRealtimeEvent {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid CRM WhatsApp realtime event.");
  }
  const event = value as Record<string, unknown>;
  if (event.type === "message") {
    const { conversationCycle, ...messageEvent } = event;
    return Object.assign({}, messageEvent, {
      message: crmMessageSchema.parse(event.message),
      cycle: crmConversationCycleSchema.parse(conversationCycle),
    }) as CrmRealtimeEvent;
  }
  if (event.type === "conversationCycle") {
    const { conversationCycle, ...cycleEvent } = event;
    return Object.assign({}, cycleEvent, {
      cycle: crmConversationCycleSchema.parse(conversationCycle),
      type: "cycle",
    }) as CrmRealtimeEvent;
  }
  return value as CrmRealtimeEvent;
}

function trimSeenEventIds(seenEventIds: Set<string>) {
  if (seenEventIds.size <= 500) return;
  const first = seenEventIds.values().next().value;
  if (first) seenEventIds.delete(first);
}

function withTicket(route: string, ticket: string) {
  const params = new URLSearchParams();
  params.set("ticket", ticket);
  return `${route}?${params.toString()}`;
}

function asError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}
