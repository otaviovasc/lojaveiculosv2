import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { AnalyticsDashboard } from "../../../domains/analytics/ports/analyticsRepository.js";
import { createAnalyticsFeature } from "./analytics.controller.js";
import type { AnalyticsServices } from "./analyticsServices.js";

describe("analytics dashboard route", () => {
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

function createApp(services: AnalyticsServices) {
  const app = new Hono();
  app.route(
    "/",
    createAnalyticsFeature({
      contextFactory: async () =>
        createServiceContext({
          actor: { id: "user_1", kind: "user" },
          permissions: ["analytics.read"],
          request: { requestId: "req_1" },
          storeId: "store_1",
          tenantId: "tenant_1",
        }),
      services,
    }),
  );
  return app;
}
