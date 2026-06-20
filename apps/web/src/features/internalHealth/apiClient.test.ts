import { describe, expect, it, vi } from "vitest";
import { createInternalHealthApi, internalHealthRoutes } from "./apiClient";

describe("internal health api", () => {
  it("builds scoped health route with auth headers", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          actionMetrics: [],
          actorMetrics: [],
          alerts: [],
          categoryMetrics: [],
          events: [],
          failures: [],
          generatedAt: "2026-01-01T10:00:00.000Z",
          outcomeMetrics: [],
          severityMetrics: [],
          sinkMetrics: [],
          status: "healthy",
          summary: {
            criticalEvents: 0,
            deniedEvents: 0,
            failedEvents: 0,
            openSinkFailures: 0,
            recentEvents: 0,
            uniqueActors: 0,
            warningEvents: 0,
          },
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      ),
    );
    const api = createInternalHealthApi({
      auth: { clerkUserId: "clerk_1", storeSlug: "loja" },
      fetch: fetchMock,
    });

    const snapshot = await api.getHealth(75);

    expect(snapshot.status).toBe("healthy");
    expect(internalHealthRoutes.health(75)).toBe(
      "/api/v1/internal/health?limit=75",
    );
    expect(internalHealthRoutes.health(250)).toBe(
      "/api/v1/internal/health?limit=100",
    );
    expect(internalHealthRoutes.health(Number.NaN)).toBe(
      "/api/v1/internal/health?limit=40",
    );
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual(
      expect.objectContaining({
        "x-clerk-user-id": "clerk_1",
        "x-store-slug": "loja",
      }),
    );
  });
});
