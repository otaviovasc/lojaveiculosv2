import { Hono } from "hono";
import type { EntitlementKey } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type {
  AnalyticsDashboard,
  HomeDashboard,
} from "../../../domains/analytics/ports/analyticsRepository.js";
import { createAnalyticsServices } from "./analyticsServices.js";
import { createAnalyticsFeature } from "./analytics.controller.js";
import type { AnalyticsServices } from "./analyticsServices.js";

describe("analytics dashboard route", () => {
  it("keeps the home dashboard available without analytics access", async () => {
    const app = createApp(createAnalyticsServices(), {
      entitlements: [],
      permissions: ["analytics.read", "dashboard.read"],
    });

    const homeResponse = await app.request("/home");
    const reportsResponse = await app.request("/dashboard");

    expect(homeResponse.status).toBe(200);
    const homeDashboard = (await homeResponse.json()) as HomeDashboard;
    expect(homeDashboard).toMatchObject({
      inventory: {
        availableListings: 18,
        totalListings: 31,
      },
      leadSummary: { activeLeads: 142 },
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    expect(reportsResponse.status).toBe(403);
  });

  it("passes the parsed from/to period to the service", async () => {
    const services = createServicesStub();
    const app = createApp(services);

    const response = await app.request(
      "/dashboard?from=2026-06-01&to=2026-06-30",
    );

    expect(response.status).toBe(200);
    expect(services.getDashboard).toHaveBeenCalledWith(expect.any(Object), {
      period: { from: "2026-06-01", to: "2026-06-30" },
    });
    const body = (await response.json()) as AnalyticsDashboard;
    expect(body.period).toEqual({
      from: "2026-06-01",
      to: "2026-06-30",
    });
  });

  it("falls back to a 30 day period when params are absent", async () => {
    const services = createServicesStub();
    const app = createApp(services);

    const response = await app.request("/dashboard");

    expect(response.status).toBe(200);
    const [, { period }] = services.getDashboard.mock.calls[0] as unknown as [
      unknown,
      { period: { from: string; to: string } },
    ];
    expect(period.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(period.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const days =
      (Date.parse(`${period.to}T00:00:00Z`) -
        Date.parse(`${period.from}T00:00:00Z`)) /
      86_400_000;
    expect(days).toBe(29);
  });
});

function createServicesStub() {
  const services: AnalyticsServices = {
    getHomeDashboard: vi.fn(async () => {
      throw new Error("Unexpected home dashboard request.");
    }),
    getDashboard: vi.fn(
      async (
        _context: unknown,
        input: { period: { from: string; to: string } },
      ) => ({ period: input.period }) as unknown as AnalyticsDashboard,
    ),
  };
  return services as AnalyticsServices & {
    getDashboard: ReturnType<typeof vi.fn>;
  };
}

function createApp(
  services: AnalyticsServices,
  access: {
    entitlements?: readonly EntitlementKey[];
    permissions?: readonly string[];
  } = {},
) {
  const app = new Hono();
  app.route(
    "/",
    createAnalyticsFeature({
      contextFactory: async () =>
        createServiceContext({
          actor: { id: "user_1", kind: "user" },
          entitlements: access.entitlements ?? ["analytics"],
          permissions: access.permissions ?? ["analytics.read"],
          request: { requestId: "req_1" },
          storeId: "store_1",
          tenantId: "tenant_1",
        }),
      services,
    }),
  );
  return app;
}
