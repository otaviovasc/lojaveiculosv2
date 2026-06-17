import { describe, expect, it, vi } from "vitest";
import { createCrmRequestHeaders } from "./apiClient";
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
});
