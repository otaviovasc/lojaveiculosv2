import { describe, expect, it, vi } from "vitest";
import {
  createCrmMessagesQuery,
  createCrmRequestHeaders,
  createCrmSessionsQuery,
  readOnlyCrmRoutes,
} from "./apiClient";
import {
  getCrmBootstrapState,
  readBridgeTokenRefresh,
  requestBridgeRefresh,
} from "./bridge";
import { CRM_BRIDGE_TOKEN_REFRESH, CRM_REQUEST_BRIDGE_REFRESH } from "./types";

function makeLocation(url: string): Location {
  return new URL(url) as unknown as Location;
}

describe("CRM migration contracts", () => {
  it("detects standalone CRM bootstrap state", () => {
    const state = getCrmBootstrapState(makeLocation("https://app.local/#crm"));

    expect(state).toMatchObject({
      bridgeToken: null,
      isBridgeLoading: false,
      isReady: true,
      mode: "standalone",
    });
  });

  it("detects embedded bootstrap state waiting for a bridge token", () => {
    const state = getCrmBootstrapState(
      makeLocation("https://app.local/?embedded=1#crm"),
    );

    expect(state).toMatchObject({
      bridgeToken: null,
      isBridgeLoading: true,
      isReady: false,
      mode: "embedded",
    });
  });

  it("keeps bridge event names compatible with repasses frontend", () => {
    const postMessage = vi.fn();

    requestBridgeRefresh({ postMessage });

    expect(postMessage).toHaveBeenCalledWith(
      { type: CRM_REQUEST_BRIDGE_REFRESH },
      "*",
    );
    expect(
      readBridgeTokenRefresh({
        bridgeToken: "fresh-token",
        type: CRM_BRIDGE_TOKEN_REFRESH,
      }),
    ).toBe("fresh-token");
  });

  it("creates the CRM API header contract without performing requests", () => {
    expect(
      createCrmRequestHeaders({
        accessToken: "session-token",
        agent: {
          email: "agent@example.com",
          id: "agent-123",
          name: "Agent",
          role: "agent",
        },
      }),
    ).toEqual({
      Authorization: "Bearer session-token",
      "x-crm-agent-id": "agent-123",
    });
  });

  it("keeps read-only CRM routes aligned with repasses backend", () => {
    expect(readOnlyCrmRoutes.bridge()).toBe("/api/v1/auth/bridge");
    expect(readOnlyCrmRoutes.login()).toBe("/api/v1/crm/agents/login");
    expect(readOnlyCrmRoutes.sseTicket()).toBe("/api/v1/crm/sse/ticket");
    expect(readOnlyCrmRoutes.sse("ticket_1")).toBe(
      "/api/v1/crm/sse?ticket=ticket_1",
    );
    expect(readOnlyCrmRoutes.listSessions()).toBe("/api/v1/crm/chat/sessions");
    expect(readOnlyCrmRoutes.listMessages(42)).toBe(
      "/api/v1/crm/chat/messages/42",
    );
  });

  it("serializes CRM sessions and messages read queries", () => {
    const sessions = createCrmSessionsQuery({
      agentId: 7,
      filterByAgent: true,
      limit: 20,
      tagIds: [1, 2],
      tagMatchMode: "any",
    });
    const messages = createCrmMessagesQuery({ limit: 30, offset: 60 });

    expect(sessions.toString()).toBe(
      "agentId=7&filterByAgent=true&limit=20&tagMatchMode=any&tagIds=1&tagIds=2",
    );
    expect(messages.toString()).toBe("limit=30&offset=60");
  });
});
