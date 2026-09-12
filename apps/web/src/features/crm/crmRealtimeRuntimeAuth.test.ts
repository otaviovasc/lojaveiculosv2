// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRuntimeFetch } from "../account/runtimeAuth";
import { createCrmConversationApi } from "./crmConversationApi";

type ClerkWindow = Window & {
  Clerk?: {
    status?: "ready";
    session?: {
      getToken?: () => Promise<string | null>;
    };
  };
};

describe("CRM realtime runtime authentication", () => {
  afterEach(() => {
    vi.useRealTimers();
    delete (window as ClerkWindow).Clerk;
  });

  it("uses a fresh Clerk token for every ticket and stream reconnect request", async () => {
    vi.useFakeTimers();
    const getToken = vi
      .fn()
      .mockResolvedValueOnce("ticket-token-1")
      .mockResolvedValueOnce("expired-stream-token")
      .mockResolvedValueOnce("stream-token-1")
      .mockResolvedValueOnce("ticket-token-2")
      .mockResolvedValueOnce("stream-token-2");
    (window as ClerkWindow).Clerk = {
      session: { getToken },
      status: "ready",
    };
    const streamControllers: ReadableStreamDefaultController<Uint8Array>[] = [];
    let ticketNumber = 0;
    const baseFetch = vi.fn<typeof fetch>(async (route, init) => {
      if (String(route).endsWith("/events/ticket")) {
        ticketNumber += 1;
        return new Response(
          JSON.stringify({
            expiresAt: "2030-01-01T00:00:00.000Z",
            ticket: `ticket-${ticketNumber}`,
          }),
          { headers: { "Content-Type": "application/json" }, status: 200 },
        );
      }
      if (
        new Headers(init?.headers).get("Authorization") ===
        "Bearer expired-stream-token"
      ) {
        return new Response("unauthorized", { status: 401 });
      }
      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            streamControllers.push(controller);
          },
        }),
        { status: 200 },
      );
    });
    const api = createCrmConversationApi({
      auth: { accessToken: "captured-stale-token" },
      fetch: createRuntimeFetch(baseFetch),
    });

    const statuses: string[] = [];
    const unsubscribe = api.subscribeEvents({
      onEvent: vi.fn(),
      onStatus: (status) => statuses.push(status),
    });
    await vi.waitFor(() => expect(statuses).toContain("connected"));
    expect(streamControllers).toHaveLength(1);
    streamControllers[0]?.error(new Error("connection lost"));
    await vi.waitFor(() => expect(statuses).toContain("degraded"));
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.waitFor(() => expect(baseFetch).toHaveBeenCalledTimes(5));

    expect(
      baseFetch.mock.calls.map(([, init]) =>
        new Headers(init?.headers).get("Authorization"),
      ),
    ).toEqual([
      "Bearer ticket-token-1",
      "Bearer expired-stream-token",
      "Bearer stream-token-1",
      "Bearer ticket-token-2",
      "Bearer stream-token-2",
    ]);
    expect(baseFetch.mock.calls[1]?.[0]).toBe("/api/v1/crm/events");
    expect(
      new Headers(baseFetch.mock.calls[1]?.[1]?.headers).get(
        "X-CRM-SSE-Ticket",
      ),
    ).toBe("ticket-1");
    expect(baseFetch.mock.calls[2]?.[0]).toBe("/api/v1/crm/events");
    expect(
      new Headers(baseFetch.mock.calls[2]?.[1]?.headers).get(
        "X-CRM-SSE-Ticket",
      ),
    ).toBe("ticket-1");
    expect(baseFetch.mock.calls[4]?.[0]).toBe("/api/v1/crm/events");
    expect(
      new Headers(baseFetch.mock.calls[4]?.[1]?.headers).get(
        "X-CRM-SSE-Ticket",
      ),
    ).toBe("ticket-2");
    unsubscribe();
  });
});
