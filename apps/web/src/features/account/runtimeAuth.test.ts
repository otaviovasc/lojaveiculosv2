// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRuntimeFetch, normalizeRuntimeApiBaseUrl } from "./runtimeAuth";

type ClerkWindow = Window & {
  __clerk_internal_ready?: Promise<unknown> & {
    __resolve?: (clerk: ClerkWindow["Clerk"]) => void;
  };
  Clerk?: {
    status?: "ready";
    session?: {
      getToken?: (options?: { skipCache?: boolean }) => Promise<string | null>;
    };
  };
};

function stubClerkGetToken(
  getToken: (options?: { skipCache?: boolean }) => Promise<string | null>,
) {
  (window as ClerkWindow).Clerk = {
    session: { getToken },
    status: "ready",
  };
}

afterEach(() => {
  delete (window as ClerkWindow).Clerk;
  delete (window as ClerkWindow).__clerk_internal_ready;
});

describe("createRuntimeFetch", () => {
  it("waits for Clerk initialization before sending an authenticated request", async () => {
    const baseFetch = vi.fn<typeof fetch>(async () => new Response("{}"));

    const request = createRuntimeFetch(baseFetch)("/api/v1/settings/store");
    await Promise.resolve();

    const clerkWindow = window as ClerkWindow;
    const ready = clerkWindow.__clerk_internal_ready;
    expect(ready).toBeDefined();

    stubClerkGetToken(async () => "late-token");
    ready?.__resolve?.(clerkWindow.Clerk);
    await request;

    const headers = new Headers(baseFetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer late-token");
  });

  it("attaches a fresh Clerk token to every request, replacing stale ones", async () => {
    stubClerkGetToken(async () => "fresh-token");
    const baseFetch = vi.fn<typeof fetch>(async () => new Response("{}"));

    const runtimeFetch = createRuntimeFetch(baseFetch);
    await runtimeFetch("/api/v1/inventory/units", {
      headers: {
        Authorization: "Bearer stale-token",
        "Content-Type": "application/json",
      },
    });

    expect(baseFetch).toHaveBeenCalledTimes(1);
    const headers = new Headers(baseFetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer fresh-token");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("leaves the request untouched when no Clerk token is available", async () => {
    (window as ClerkWindow).Clerk = { status: "ready" };
    const baseFetch = vi.fn<typeof fetch>(async () => new Response("{}"));

    const runtimeFetch = createRuntimeFetch(baseFetch);
    const init = { headers: { "x-clerk-user-id": "local-dev" } };
    await runtimeFetch("/api/v1/inventory/units", init);

    expect(baseFetch).toHaveBeenCalledWith("/api/v1/inventory/units", init);
  });

  it("refreshes the token and retries once on 401", async () => {
    const getToken = vi
      .fn()
      .mockResolvedValueOnce("expired-token")
      .mockResolvedValueOnce("renewed-token");
    stubClerkGetToken(getToken);
    const baseFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(new Response("{}"));

    const runtimeFetch = createRuntimeFetch(baseFetch);
    const response = await runtimeFetch("/api/v1/inventory/units");

    expect(response.status).toBe(200);
    expect(getToken).toHaveBeenNthCalledWith(1, undefined);
    expect(getToken).toHaveBeenNthCalledWith(2, { skipCache: true });
    expect(baseFetch).toHaveBeenCalledTimes(2);
    const retryHeaders = new Headers(baseFetch.mock.calls[1]?.[1]?.headers);
    expect(retryHeaders.get("Authorization")).toBe("Bearer renewed-token");
  });

  it("does not retry when the refreshed token is unchanged", async () => {
    stubClerkGetToken(async () => "same-token");
    const baseFetch = vi.fn<typeof fetch>(
      async () => new Response("unauthorized", { status: 401 }),
    );

    const runtimeFetch = createRuntimeFetch(baseFetch);
    const response = await runtimeFetch("/api/v1/inventory/units");

    expect(response.status).toBe(401);
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry non-401 failures", async () => {
    stubClerkGetToken(async () => "token");
    const baseFetch = vi.fn<typeof fetch>(
      async () => new Response("forbidden", { status: 403 }),
    );

    const runtimeFetch = createRuntimeFetch(baseFetch);
    const response = await runtimeFetch("/api/v1/inventory/units");

    expect(response.status).toBe(403);
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });
});

describe("normalizeRuntimeApiBaseUrl", () => {
  it.each([
    ["https://api.example.com", "https://api.example.com/api/v1"],
    ["https://api.example.com/", "https://api.example.com/api/v1"],
    ["https://api.example.com/api/v1", "https://api.example.com/api/v1"],
    ["/api/v1", "/api/v1"],
  ])("normalizes %s to %s", (baseUrl, expected) => {
    expect(normalizeRuntimeApiBaseUrl(baseUrl)).toBe(expected);
  });
});
