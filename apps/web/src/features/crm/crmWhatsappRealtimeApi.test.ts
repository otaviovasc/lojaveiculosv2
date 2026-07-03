import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeCrmWhatsappEvents } from "./crmWhatsappRealtimeApi";
import type { CrmWhatsappRealtimeEvent } from "./crmWhatsappTypes";

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

  emit(data: CrmWhatsappRealtimeEvent, lastEventId = "", type = "message") {
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
    const events: CrmWhatsappRealtimeEvent[] = [];

    const unsubscribe = subscribeCrmWhatsappEvents({
      connectionId: "connection-1",
      eventsRoute: "/events",
      eventsTicketRoute: "/events/ticket",
      onEvent: (event) => events.push(event),
      postJson,
    });
    await flushPromises();

    expect(FakeEventSource.instances[0]?.url).toBe("/events?ticket=ticket-1");
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
  });

  it("dispatches named SSE events from custom EventSource channels", async () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    const postJson = vi
      .fn()
      .mockResolvedValue({ expiresAt: "2030-01-01", ticket: "ticket-1" });
    const events: CrmWhatsappRealtimeEvent[] = [];

    const unsubscribe = subscribeCrmWhatsappEvents({
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
});

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function readEventStatus(event: CrmWhatsappRealtimeEvent) {
  return event.type === "connection_status" ? event.status : event.type;
}
