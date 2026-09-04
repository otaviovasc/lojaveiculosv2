import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type { AgencyStatsReport } from "../../../domains/agency/ports/agencyStatsRepository.js";
import { AgencyStatsStoreNotFoundError } from "../../../domains/agency/ports/agencyStatsRepository.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createAgencyStatsFeature } from "./agencyStats.controller.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const storeId = "22222222-2222-4222-8222-222222222222";

describe("agency stats controller", () => {
  it("passes an explicit store and date range to the tenant-scoped service", async () => {
    const getStats = vi.fn(async () => report());
    const app = createTestApp(getStats);

    const response = await app.request(
      `/api/v1/agency/tenants/${tenantId}/stats?from=2026-08-01&to=2026-08-22&storeId=${storeId}`,
    );

    expect(response.status).toBe(200);
    expect(getStats).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId, storeId: null }),
      {
        period: { from: "2026-08-01", to: "2026-08-22" },
        storeId,
      },
    );
  });

  it("rejects reversed or incomplete date ranges without calling services", async () => {
    const getStats = vi.fn(async () => report());
    const app = createTestApp(getStats);

    const reversed = await app.request(
      `/api/v1/agency/tenants/${tenantId}/stats?from=2026-08-22&to=2026-08-01`,
    );
    const incomplete = await app.request(
      `/api/v1/agency/tenants/${tenantId}/stats?from=2026-08-01`,
    );

    expect(reversed.status).toBe(400);
    expect(incomplete.status).toBe(400);
    expect(getStats).not.toHaveBeenCalled();
    expect(await reversed.json()).toMatchObject({
      code: "AGENCY_STATS_REQUEST_INVALID",
    });
  });

  it("maps an out-of-tenant store to a stable not-found response", async () => {
    const app = createTestApp(
      vi.fn(async () => {
        throw new AgencyStatsStoreNotFoundError();
      }),
    );

    const response = await app.request(
      `/api/v1/agency/tenants/${tenantId}/stats?storeId=${storeId}`,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      code: "AGENCY_STATS_STORE_NOT_FOUND",
    });
  });
});

function createTestApp(
  getStats: (context: never, input: never) => Promise<AgencyStatsReport>,
) {
  const app = new Hono();
  app.route(
    "/api/v1/agency",
    createAgencyStatsFeature({
      accountContextFactory: async (_context, scope) => ({
        profile: {
          clerkUserId: "clerk_agency",
          email: "agency@example.com",
          emailVerified: true,
          name: "Agency User",
        },
        serviceContext: createServiceContext({
          actor: { id: "user_agency", kind: "user" },
          permissions: ["analytics.read"],
          request: { requestId: "req_agency_stats" },
          tenantId: scope.tenantId,
        }),
      }),
      services: { getStats: getStats as never },
    }),
  );
  return app;
}

function report(): AgencyStatsReport {
  return {
    availableStores: [],
    generatedAt: new Date("2026-08-22T12:00:00.000Z"),
    leadSources: [],
    period: { from: "2026-08-01", to: "2026-08-22" },
    scopeStoreId: null,
    stores: [],
    tenantId,
    totals: {
      inventory: { availableListings: 0, reservedUnits: 0, totalListings: 0 },
      leads: { activeCount: 0, conversionRate: 0, totalCount: 0, wonCount: 0 },
      sales: {
        averageTicketCents: 0,
        closedCount: 0,
        grossMarginCents: 0,
        revenueCents: 0,
      },
      storeCount: 0,
    },
  };
}
