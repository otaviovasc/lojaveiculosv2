// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRuntimeFetch } from "./runtimeAuth";

type ClerkWindow = Window & {
  Clerk?: {
    session?: {
      getToken?: (options?: { skipCache?: boolean }) => Promise<string | null>;
    };
  };
};

function stubClerkGetToken(
  getToken: (options?: { skipCache?: boolean }) => Promise<string | null>,
) {
  (window as ClerkWindow).Clerk = { session: { getToken } };
}

afterEach(() => {
  delete (window as ClerkWindow).Clerk;
});

describe("createRuntimeFetch", () => {
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
