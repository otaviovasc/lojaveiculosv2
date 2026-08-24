import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeCrmEvents } from "./crmRealtimeApi";
import type { CrmRealtimeEvent } from "./crmConversationTypes";

class FakeEventSource {
  static instances: FakeEventSource[] = [];

  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  private readonly listeners = new Map<string, EventListener[]>();

  close = vi.fn();

  constructor(
    readonly url: string,
    readonly init?: EventSourceInit,
  ) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  emit(data: unknown, lastEventId = "", type = "message") {
    const event = {
      data: JSON.stringify(data),
      lastEventId,
      type,
    } as MessageEvent;
    this.listeners.get(type)?.forEach((listener) => listener(event));
    if (type === "message") this.onmessage?.(event);
  }

  fail() {
    this.onerror?.({} as Event);
  }
}

describe("CRM WhatsApp realtime API", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    FakeEventSource.instances = [];
  });

  it("dedupes replayed SSE frames and reconnects with the last event id", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", FakeEventSource);
    const postJson = vi
      .fn()
      .mockResolvedValueOnce({ expiresAt: "2030-01-01", ticket: "ticket-1" })
      .mockResolvedValueOnce({ expiresAt: "2030-01-01", ticket: "ticket-2" });
    const events: CrmRealtimeEvent[] = [];
    const statuses: string[] = [];

    const unsubscribe = subscribeCrmEvents({
      connectionId: "connection-1",
      eventsRoute: "/events",
      eventsTicketRoute: "/events/ticket",
      onEvent: (event) => events.push(event),
      onStatus: (status) => statuses.push(status),
      postJson,
    });
    await flushPromises();

    expect(FakeEventSource.instances[0]?.url).toBe("/events?ticket=ticket-1");
    FakeEventSource.instances[0]!.onopen?.({} as Event);
    const event = {
      connectionId: "connection-1",
      phone: null,
      status: "connected",
      type: "connection_status" as const,
    };
    FakeEventSource.instances[0]!.emit(event, "redis-1");
    FakeEventSource.instances[0]!.emit(event, "redis-1");
    expect(events).toHaveLength(1);

    FakeEventSource.instances[0]!.fail();
    await vi.advanceTimersByTimeAsync(1_000);
    await flushPromises();

    expect(postJson).toHaveBeenLastCalledWith("/events/ticket", {
      connectionId: "connection-1",
      lastEventId: "redis-1",
    });
    expect(FakeEventSource.instances[1]?.url).toBe("/events?ticket=ticket-2");
    FakeEventSource.instances[1]!.emit(
      { ...event, status: "disconnected" },
      "redis-2",
    );
    expect(events.map(readEventStatus)).toEqual(["connected", "disconnected"]);

    unsubscribe();
    expect(statuses).toEqual(
      expect.arrayContaining([
        "connecting",
        "connected",
        "degraded",
        "offline",
      ]),
    );
  });

  it("dispatches named SSE events from custom EventSource channels", async () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    const postJson = vi
      .fn()
      .mockResolvedValue({ expiresAt: "2030-01-01", ticket: "ticket-1" });
    const events: CrmRealtimeEvent[] = [];

    const unsubscribe = subscribeCrmEvents({
      eventsRoute: "/events",
      eventsTicketRoute: "/events/ticket",
      onEvent: (event) => events.push(event),
      postJson,
    });
    await flushPromises();

    FakeEventSource.instances[0]!.emit(
      {
        connectionId: "connection-1",
        phone: "+5511999999999",
        status: "connected",
        type: "connection_status",
      },
      "redis-1",
      "connection_status",
    );

    expect(events.map(readEventStatus)).toEqual(["connected"]);

    unsubscribe();
  });

  it("normalizes backend conversation-cycle fields for inbound messages", async () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    const postJson = vi
      .fn()
      .mockResolvedValue({ expiresAt: "2030-01-01", ticket: "ticket-1" });
    const events: CrmRealtimeEvent[] = [];
    const onError = vi.fn();

    const unsubscribe = subscribeCrmEvents({
      eventsRoute: "/events",
      eventsTicketRoute: "/events/ticket",
      onError,
      onEvent: (event) => events.push(event),
      postJson,
    });
    await flushPromises();

    FakeEventSource.instances[0]!.emit(
      {
        connectionId: "connection-1",
        conversationCycle: createWireCycle(),
        message: createWireMessage(),
        type: "message",
      },
      "redis-1",
      "message",
    );

    expect(events).toHaveLength(1);
    const [messageEvent] = events;
    expect(messageEvent?.type).toBe("message");
    if (!messageEvent || messageEvent.type !== "message") {
      throw new Error("Expected a CRM message realtime event.");
    }
    expect(messageEvent.cycle.id).toBe("cycle-1");
    expect(messageEvent.message.id).toBe("message-1");
    expect(onError).not.toHaveBeenCalled();

    unsubscribe();
  });

  it("reconnects after an invalid realtime event instead of staying degraded", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", FakeEventSource);
    const onError = vi.fn();
    const postJson = vi
      .fn()
      .mockResolvedValueOnce({ expiresAt: "2030-01-01", ticket: "ticket-1" })
      .mockResolvedValueOnce({ expiresAt: "2030-01-01", ticket: "ticket-2" });

    const unsubscribe = subscribeCrmEvents({
      eventsRoute: "/events",
      eventsTicketRoute: "/events/ticket",
      onError,
      onEvent: vi.fn(),
      postJson,
    });
    await flushPromises();

    FakeEventSource.instances[0]!.emit(
      { type: "message", conversationCycle: {}, message: {} },
      "invalid-1",
      "message",
    );

    expect(onError).toHaveBeenCalledOnce();
    expect(FakeEventSource.instances[0]!.close).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1_000);
    await flushPromises();
    expect(FakeEventSource.instances[1]?.url).toBe("/events?ticket=ticket-2");

    unsubscribe();
  });

  it("dispatches backend conversation-cycle event names", async () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    const events: CrmRealtimeEvent[] = [];
    const unsubscribe = subscribeCrmEvents({
      eventsRoute: "/events",
      eventsTicketRoute: "/events/ticket",
      onEvent: (event) => events.push(event),
      postJson: vi
        .fn()
        .mockResolvedValue({ expiresAt: "2030-01-01", ticket: "ticket-1" }),
    });
    await flushPromises();

    FakeEventSource.instances[0]!.emit(
      {
        connectionId: "connection-1",
        conversationCycle: createWireCycle(),
        type: "conversationCycle",
      },
      "redis-2",
      "conversationCycle",
    );

    expect(events).toHaveLength(1);
    const [cycleEvent] = events;
    expect(cycleEvent?.type).toBe("cycle");
    if (!cycleEvent || cycleEvent.type !== "cycle") {
      throw new Error("Expected a CRM conversation-cycle realtime event.");
    }
    expect(cycleEvent.cycle.id).toBe("cycle-1");

    unsubscribe();
  });

  it("opens ticket-authenticated SSE without credentialed CORS mode", async () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    const postJson = vi
      .fn()
      .mockResolvedValue({ expiresAt: "2030-01-01", ticket: "ticket-1" });

    const unsubscribe = subscribeCrmEvents({
      eventsRoute: "https://api.example.test/events",
      eventsTicketRoute: "https://api.example.test/events/ticket",
      onEvent: vi.fn(),
      postJson,
    });
    await flushPromises();

    expect(FakeEventSource.instances[0]?.init?.withCredentials).not.toBe(true);

    unsubscribe();
  });
});

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function readEventStatus(event: CrmRealtimeEvent) {
  return event.type === "connection_status" ? event.status : event.type;
}

function createWireCycle() {
  return {
    channel: "whatsapp",
    id: "cycle-1",
    revision: 1,
    status: "HUMAN_TAKEOVER",
  };
}

function createWireMessage() {
  return {
    channel: "whatsapp",
    content: "Olá",
    createdAt: "2026-08-20T12:00:00.000Z",
    direction: "INBOUND",
    id: "message-1",
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    type: "TEXT",
  };
}
