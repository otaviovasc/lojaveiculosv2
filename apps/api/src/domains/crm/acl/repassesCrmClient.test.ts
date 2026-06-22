import { describe, expect, it, vi } from "vitest";
import { createHttpRepassesCrmClient } from "./repassesCrmClient.js";

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("Repasses CRM HTTP client", () => {
  it("does not reuse the bridge default connection for unscoped calls", async () => {
    const calls: RequestInit[] = [];
    const fetch = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        calls.push(init ?? {});
        return calls.length === 1
          ? createJsonResponse({
              connection: { id: 9 },
              token: "repasses-token",
            })
          : createJsonResponse({ connections: [] });
      },
    );
    const client = createHttpRepassesCrmClient({
      baseUrl: "https://crm.test",
      fetch,
    });

    await client.getConnections({ clerkSessionToken: "clerk-token" });

    expect(calls[1]?.headers).toMatchObject({
      Authorization: "Bearer repasses-token",
    });
    expect(calls[1]?.headers).not.toMatchObject({
      "x-crm-connection-id": "9",
    });
  });

  it("sends the V2-selected connection when explicitly scoped", async () => {
    const calls: RequestInit[] = [];
    const fetch = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        calls.push(init ?? {});
        return calls.length === 1
          ? createJsonResponse({
              connection: { id: 9 },
              token: "repasses-token",
            })
          : createJsonResponse([]);
      },
    );
    const client = createHttpRepassesCrmClient({
      baseUrl: "https://crm.test",
      fetch,
    });

    await client.listSessions({
      clerkSessionToken: "clerk-token",
      repassesConnectionId: 10,
    });

    expect(calls[1]?.headers).toMatchObject({
      "x-crm-connection-id": "10",
    });
  });

  it("marks assignment unavailable when bridge context differs from V2 scope", async () => {
    const fetch = vi.fn(async () =>
      createJsonResponse({ connection: { id: 9 }, token: "repasses-token" }),
    );
    const client = createHttpRepassesCrmClient({
      baseUrl: "https://crm.test",
      fetch,
    });

    await expect(
      client.getAuthContext({
        clerkSessionToken: "clerk-token",
        repassesConnectionId: 10,
      }),
    ).resolves.toEqual({ canAssignSessions: false, connectionId: 9 });
  });
});
