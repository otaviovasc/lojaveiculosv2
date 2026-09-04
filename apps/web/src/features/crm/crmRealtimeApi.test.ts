import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeCrmEvents } from "./crmRealtimeApi";
import type { CrmRealtimeEvent } from "./crmConversationTypes";

describe("CRM WhatsApp realtime API", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens the ticketed stream through authenticated fetch", async () => {
    const streams = createSseFetch();
    const unsubscribe = subscribeCrmEvents({
      eventsRoute: "https://api.example.test/events",
      eventsTicketRoute: "https://api.example.test/events/ticket",
      fetch: streams.fetch,
      headers: { Authorization: "Bearer clerk-token" },
      onEvent: vi.fn(),
      postJson: vi
        .fn()
        .mockResolvedValue({ expiresAt: "2030-01-01", ticket: "ticket-1" }),
    });
    await flushPromises();

    expect(streams.fetch).toHaveBeenCalledOnce();
    const [route, init] = streams.fetch.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    expect(route).toBe("https://api.example.test/events");
    expect(headers.get("Authorization")).toBe("Bearer clerk-token");
    expect(headers.get("Accept")).toBe("text/event-stream");
    expect(headers.get("Cache-Control")).toBeNull();
    expect(headers.get("X-CRM-SSE-Ticket")).toBe("ticket-1");
    expect(init?.credentials).toBeUndefined();

    unsubscribe();
    expect(init?.signal?.aborted).toBe(true);
  });

  it("parses chunked named events, ignores heartbeats, and dedupes replay", async () => {
    const streams = createSseFetch();
    const events: CrmRealtimeEvent[] = [];
    const unsubscribe = subscribeCrmEvents({
      eventsRoute: "/events",
      eventsTicketRoute: "/events/ticket",
      fetch: streams.fetch,
      onEvent: (event) => events.push(event),
      postJson: vi
        .fn()
        .mockResolvedValue({ expiresAt: "2030-01-01", ticket: "ticket-1" }),
    });
    await flushPromises();

    const event = connectionStatusEvent("connected");
    const frame = createSseFrame(event, "connection_status", "redis-1");
    streams.push(0, ": heartbeat\r\n\r\n", frame.slice(0, 19), frame.slice(19));
    streams.push(0, frame);
    await flushPromises();

    expect(events).toEqual([event]);
    unsubscribe();
  });

  it("reconnects with a fresh ticket and the last valid event id", async () => {
    vi.useFakeTimers();
    const streams = createSseFetch();
    const postJson = vi
      .fn()
      .mockResolvedValueOnce({ expiresAt: "2030-01-01", ticket: "ticket-1" })
      .mockResolvedValueOnce({ expiresAt: "2030-01-01", ticket: "ticket-2" });
    const statuses: string[] = [];
    const unsubscribe = subscribeCrmEvents({
      connectionId: "connection-1",
      eventsRoute: "/events",
      eventsTicketRoute: "/events/ticket",
      fetch: streams.fetch,
      onEvent: vi.fn(),
      onStatus: (status) => statuses.push(status),
      postJson,
    });
    await flushPromises();

    streams.push(
      0,
      createSseFrame(
        connectionStatusEvent("connected"),
        "connection_status",
        "redis-1",
      ),
    );
    await flushPromises();
    streams.end(0);
    await flushPromises();

    expect(statuses).toContain("degraded");
    await vi.advanceTimersByTimeAsync(1_000);
    await flushPromises();

    expect(postJson).toHaveBeenLastCalledWith("/events/ticket", {
      connectionId: "connection-1",
      lastEventId: "redis-1",
    });
    const reconnectHeaders = new Headers(
      streams.fetch.mock.calls[1]?.[1]?.headers,
    );
    expect(streams.fetch.mock.calls[1]?.[0]).toBe("/events");
    expect(reconnectHeaders.get("X-CRM-SSE-Ticket")).toBe("ticket-2");
    unsubscribe();
    expect(statuses.at(-1)).toBe("offline");
  });

  it("reconnects after an invalid event without advancing the replay cursor", async () => {
    vi.useFakeTimers();
    const streams = createSseFetch();
    const postJson = vi
      .fn()
      .mockResolvedValueOnce({ expiresAt: "2030-01-01", ticket: "ticket-1" })
      .mockResolvedValueOnce({ expiresAt: "2030-01-01", ticket: "ticket-2" });
    const onError = vi.fn();
    const unsubscribe = subscribeCrmEvents({
      eventsRoute: "/events",
      eventsTicketRoute: "/events/ticket",
      fetch: streams.fetch,
      onError,
      onEvent: vi.fn(),
      postJson,
    });
    await flushPromises();

    streams.push(
      0,
      createSseFrame(
        { conversationCycle: {}, message: {}, type: "message" },
        "message",
        "invalid-cursor",
      ),
    );
    await flushPromises();

    expect(onError).toHaveBeenCalledWith(
      new Error("Invalid CRM WhatsApp realtime event."),
    );
    await vi.advanceTimersByTimeAsync(1_000);
    await flushPromises();
    expect(postJson).toHaveBeenLastCalledWith("/events/ticket", {
      connectionId: undefined,
      lastEventId: undefined,
    });
    unsubscribe();
  });

  it("does not advance the replay cursor when the event consumer fails", async () => {
    vi.useFakeTimers();
    const streams = createSseFetch();
    const postJson = vi
      .fn()
      .mockResolvedValueOnce({ expiresAt: "2030-01-01", ticket: "ticket-1" })
      .mockResolvedValueOnce({ expiresAt: "2030-01-01", ticket: "ticket-2" });
    const unsubscribe = subscribeCrmEvents({
      eventsRoute: "/events",
      eventsTicketRoute: "/events/ticket",
      fetch: streams.fetch,
      onEvent: () => {
        throw new Error("consumer failed");
      },
      postJson,
    });
    await flushPromises();

    streams.push(
      0,
      createSseFrame(
        connectionStatusEvent("connected"),
        "connection_status",
        "redis-consumer-failure",
      ),
    );
    await flushPromises();
    await vi.advanceTimersByTimeAsync(1_000);
    await flushPromises();

    expect(postJson).toHaveBeenLastCalledWith("/events/ticket", {
      connectionId: undefined,
      lastEventId: undefined,
    });
    unsubscribe();
  });

  it("recovers from the authenticated stream returning 403", async () => {
    vi.useFakeTimers();
    const controllers: ReadableStreamDefaultController<Uint8Array>[] = [];
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockImplementationOnce(async () =>
        Promise.resolve(
          new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controllers.push(controller);
              },
            }),
            { status: 200 },
          ),
        ),
      );
    const postJson = vi
      .fn()
      .mockResolvedValueOnce({ expiresAt: "2030-01-01", ticket: "ticket-1" })
      .mockResolvedValueOnce({ expiresAt: "2030-01-01", ticket: "ticket-2" });
    const statuses: string[] = [];
    const unsubscribe = subscribeCrmEvents({
      eventsRoute: "/events",
      eventsTicketRoute: "/events/ticket",
      fetch,
      headers: { Authorization: "Bearer clerk-token" },
      onEvent: vi.fn(),
      onStatus: (status) => statuses.push(status),
      postJson,
    });
    await flushPromises();

    expect(statuses).toContain("degraded");
    await vi.advanceTimersByTimeAsync(1_000);
    await flushPromises();

    expect(postJson).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(statuses.at(-1)).toBe("connected");
    expect(
      new Headers(fetch.mock.calls[1]?.[1]?.headers).get("Authorization"),
    ).toBe("Bearer clerk-token");
    expect(
      new Headers(fetch.mock.calls[1]?.[1]?.headers).get("X-CRM-SSE-Ticket"),
    ).toBe("ticket-2");
    unsubscribe();
    expect(controllers[0]).toBeDefined();
  });

  it("does not open a stream after an obsolete ticket request resolves", async () => {
    const streams = createSseFetch();
    let resolveTicket:
      ((ticket: { expiresAt: string; ticket: string }) => void) | undefined;
    const postJson = vi.fn(
      () =>
        new Promise<{ expiresAt: string; ticket: string }>((resolve) => {
          resolveTicket = resolve;
        }),
    );
    const unsubscribe = subscribeCrmEvents({
      eventsRoute: "/events",
      eventsTicketRoute: "/events/ticket",
      fetch: streams.fetch,
      onEvent: vi.fn(),
      postJson: postJson as Parameters<
        typeof subscribeCrmEvents
      >[0]["postJson"],
    });

    unsubscribe();
    resolveTicket?.({ expiresAt: "2030-01-01", ticket: "stale-ticket" });
    await flushPromises();

    expect(streams.fetch).not.toHaveBeenCalled();
  });

  it("normalizes backend message and conversation-cycle event payloads", async () => {
    const streams = createSseFetch();
    const events: CrmRealtimeEvent[] = [];
    const unsubscribe = subscribeCrmEvents({
      eventsRoute: "/events",
      eventsTicketRoute: "/events/ticket",
      fetch: streams.fetch,
      onEvent: (event) => events.push(event),
      postJson: vi
        .fn()
        .mockResolvedValue({ expiresAt: "2030-01-01", ticket: "ticket-1" }),
    });
    await flushPromises();

    streams.push(
      0,
      createSseFrame(
        {
          connectionId: "connection-1",
          conversationCycle: createWireCycle(),
          message: createWireMessage(),
          type: "message",
        },
        "message",
        "redis-1",
      ),
      createSseFrame(
        {
          connectionId: "connection-1",
          conversationCycle: createWireCycle(),
          type: "conversationCycle",
        },
        "conversationCycle",
        "redis-2",
      ),
    );
    await flushPromises();

    expect(events.map((event) => event.type)).toEqual(["message", "cycle"]);
    expect(events[0]).toMatchObject({
      cycle: { id: "cycle-1" },
      message: { id: "message-1" },
    });
    unsubscribe();
  });
});

function createSseFetch() {
  const controllers: ReadableStreamDefaultController<Uint8Array>[] = [];
  const encoder = new TextEncoder();
  const fetch = vi.fn<typeof globalThis.fetch>(async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controllers.push(controller);
      },
    });
    return new Response(body, {
      headers: { "Content-Type": "text/event-stream" },
      status: 200,
    });
  });
  return {
    end(index: number) {
      controllers[index]?.close();
    },
    fetch,
    push(index: number, ...chunks: string[]) {
      chunks.forEach((chunk) =>
        controllers[index]?.enqueue(encoder.encode(chunk)),
      );
    },
  };
}

function createSseFrame(data: unknown, event: string, id: string) {
  return `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function connectionStatusEvent(status: string) {
  return {
    connectionId: "connection-1",
    phone: null,
    status,
    type: "connection_status" as const,
  };
}

async function flushPromises() {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
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
