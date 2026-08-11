import type {
  CrmWhatsappConnectionId,
  CrmWhatsappEventsTicket,
  CrmWhatsappRealtimeEvent,
  CrmWhatsappRealtimeStatus,
} from "./crmWhatsappTypes";
import {
  parseCrmWhatsappMessage,
  parseCrmWhatsappSession,
} from "./crmWhatsappModel";

type JsonBody = Record<string, unknown>;

const crmWhatsappSseEventNames = [
  "connected",
  "connection_status",
  "message",
  "message_status",
  "presence",
  "session",
] as const;

export function subscribeCrmWhatsappEvents(input: {
  connectionId?: CrmWhatsappConnectionId | null | undefined;
  eventsRoute: string;
  eventsTicketRoute: string;
  onError?: ((error: Error) => void) | undefined;
  onEvent: (event: CrmWhatsappRealtimeEvent) => void;
  onStatus?: (status: CrmWhatsappRealtimeStatus) => void;
  postJson: <T>(route: string, body?: JsonBody) => Promise<T>;
}) {
  let closed = false;
  let eventSource: EventSource | null = null;
  let lastEventId: string | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
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

  const scheduleReconnect = () => {
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
    const ticket = await input.postJson<CrmWhatsappEventsTicket>(
      input.eventsTicketRoute,
      {
        connectionId: input.connectionId ?? undefined,
        lastEventId: lastEventId ?? undefined,
      },
    );
    if (closed || generation !== connectGeneration) return;
    const source = new EventSource(
      withTicket(input.eventsRoute, ticket.ticket),
      {
        withCredentials: true,
      },
    );
    eventSource = source;
    source.onopen = () => {
      reconnectAttempts = 0;
      input.onStatus?.("connected");
    };
    const handleMessage = (event: MessageEvent) => {
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
      }
    };
    crmWhatsappSseEventNames.forEach((eventName) => {
      source.addEventListener(eventName, handleMessage as EventListener);
    });
    source.onerror = () => {
      if (closed) return;
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
    closeEventSource();
  };
}

function parseRealtimeEvent(value: unknown): CrmWhatsappRealtimeEvent {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid CRM WhatsApp realtime event.");
  }
  const event = value as Record<string, unknown>;
  if (event.type === "message") {
    return Object.assign({}, event, {
      message: parseCrmWhatsappMessage(event.message),
      session: parseCrmWhatsappSession(event.session),
    }) as CrmWhatsappRealtimeEvent;
  }
  if (event.type === "session") {
    return Object.assign({}, event, {
      session: parseCrmWhatsappSession(event.session),
    }) as CrmWhatsappRealtimeEvent;
  }
  return value as CrmWhatsappRealtimeEvent;
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
