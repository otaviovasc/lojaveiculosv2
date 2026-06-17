import { describe, expect, it } from "vitest";
import { createReadOnlyCrmApi } from "./apiClient";
import type { CrmAuthState } from "./types";

type FetchCall = {
  init: RequestInit | undefined;
  input: RequestInfo | URL;
};

const auth: CrmAuthState = {
  accessToken: "session-token",
  agent: {
    email: "agent@example.com",
    id: "agent-123",
    name: "Agent",
    role: "agent",
  },
};

function createFakeFetch(payloads: unknown[]) {
  const calls: FetchCall[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    calls.push({ init, input });

    return new Response(JSON.stringify(payloads.shift() ?? {}), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  };

  return { calls, fetch: fakeFetch };
}

function headersOf(call: FetchCall) {
  return call.init?.headers as Record<string, string>;
}

function callAt(calls: FetchCall[], index: number) {
  const call = calls[index];

  if (!call) {
    throw new Error(`Missing fetch call ${index}`);
  }

  return call;
}

describe("createReadOnlyCrmApi", () => {
  it("posts bridge and login payloads without auth headers", async () => {
    const fake = createFakeFetch([
      { accessToken: "bridge-token" },
      { accessToken: "login-token" },
    ]);
    const api = createReadOnlyCrmApi({
      auth,
      baseUrl: "https://crm.local/api/v1/",
      fetch: fake.fetch,
    });

    await api.bridge("bridge-1");
    await api.login("agent@example.com", "secret");

    const bridgeCall = callAt(fake.calls, 0);
    const loginCall = callAt(fake.calls, 1);

    expect(bridgeCall).toMatchObject({
      input: "https://crm.local/api/v1/auth/bridge",
      init: {
        body: JSON.stringify({ bridgeToken: "bridge-1" }),
        method: "POST",
      },
    });
    expect(headersOf(bridgeCall)).toEqual({
      "Content-Type": "application/json",
    });
    expect(loginCall).toMatchObject({
      input: "https://crm.local/api/v1/crm/agents/login",
      init: {
        body: JSON.stringify({
          email: "agent@example.com",
          password: "secret",
        }),
        method: "POST",
      },
    });
  });

  it("adds auth headers and query params for read-only CRM reads", async () => {
    const fake = createFakeFetch([[], []]);
    const api = createReadOnlyCrmApi({
      auth,
      baseUrl: "/backend",
      fetch: fake.fetch,
    });

    await api.listSessions({
      filterByAgent: true,
      limit: 20,
      offset: 40,
      search: "lead",
      tagIds: [1, 2],
    });
    await api.listMessages(42, { limit: 30, offset: 60 });

    const sessionsCall = callAt(fake.calls, 0);
    const messagesCall = callAt(fake.calls, 1);

    expect(sessionsCall.input).toBe(
      "/backend/crm/chat/sessions?filterByAgent=true&limit=20&offset=40&search=lead&tagIds=1&tagIds=2",
    );
    expect(sessionsCall.init?.method).toBe("GET");
    expect(headersOf(sessionsCall)).toMatchObject({
      Authorization: "Bearer session-token",
      "x-crm-agent-id": "agent-123",
    });
    expect(messagesCall.input).toBe(
      "/backend/crm/chat/messages/42?limit=30&offset=60",
    );
  });

  it("requests SSE tickets with the provided token", async () => {
    const fake = createFakeFetch([{ expiresAt: "2026-01-01T00:00:00Z" }]);
    const api = createReadOnlyCrmApi({
      auth: { ...auth, accessToken: "old-token" },
      fetch: fake.fetch,
    });

    await api.requestSseTicket("fresh-token");

    const ticketCall = callAt(fake.calls, 0);

    expect(ticketCall).toMatchObject({
      input: "/api/v1/crm/sse/ticket",
      init: {
        body: JSON.stringify({ _authToken: "fresh-token" }),
        method: "POST",
      },
    });
    expect(headersOf(ticketCall)).toMatchObject({
      Authorization: "Bearer fresh-token",
      "x-crm-agent-id": "agent-123",
    });
  });
});
