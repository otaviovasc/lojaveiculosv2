import { Hono } from "hono";
import type { EntitlementKey } from "@lojaveiculosv2/shared";
import { PDFDocument } from "pdf-lib";
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

  it("materializes the executive report as downloadable PDF bytes", async () => {
    const app = createApp(createAnalyticsServices(), {
      permissions: ["analytics.read", "finance.read"],
    });

    const response = await app.request(
      "/dashboard.pdf?from=2026-06-01&to=2026-06-30",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="relatorio-executivo-2026-06-01-a-2026-06-30.pdf"',
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 8))).toContain("%PDF");
    expect(bytes.byteLength).toBeGreaterThan(1_000);
    const document = await PDFDocument.load(bytes);
    expect(document.getTitle()).toBe("Relatório executivo");
    expect(document.getAuthor()).toBe("Loja Veículos OS");
  });

  it("requires finance access for the executive PDF", async () => {
    const app = createApp(createAnalyticsServices());

    const response = await app.request(
      "/dashboard.pdf?from=2026-06-01&to=2026-06-30",
    );

    expect(response.status).toBe(403);
  });

  it("keeps finance, CRM, and document report values behind their permissions", async () => {
    const app = createApp(createAnalyticsServices());

    const response = await app.request(
      "/dashboard?from=2026-06-01&to=2026-06-30",
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as AnalyticsDashboard;
    expect(body.finance).toMatchObject({
      availability: { status: "restricted" },
      paidOutflowCents: 0,
      receivedRevenueCents: 0,
    });
    expect(body.owner).toMatchObject({
      availability: { status: "restricted" },
      vehicles: [],
    });
    expect(body.crm).toMatchObject({
      availability: { status: "restricted" },
      interactionCount: 0,
      totalLeads: 0,
    });
    expect(body.documents).toMatchObject({
      availability: { status: "restricted" },
      byKind: [],
      total: 0,
    });
    expect(body.financialAvailability.status).toBe("restricted");
    expect(body.attention).toMatchObject({
      overdueReceivablesCents: null,
      overdueReceivablesCount: null,
    });
    expect(body.revenue).toEqual({
      closedSalesCents: null,
      openReceivablesCents: null,
      paidReceiptsCents: null,
    });
    expect(body.sales).toMatchObject({
      avgTicketCents: null,
      grossMarginCents: null,
      revenueCents: null,
    });
    expect(body.kpis.map((kpi) => kpi.label)).not.toContain("GMV fechado");
    expect(body.kpis.map((kpi) => kpi.label)).not.toContain(
      "Recebiveis abertos",
    );
  });

  it("preserves financial metrics for a custom role with finance.read", async () => {
    const app = createApp(createAnalyticsServices(), {
      permissions: ["analytics.read", "finance.read"],
    });

    const response = await app.request(
      "/dashboard?from=2026-06-01&to=2026-06-30",
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as AnalyticsDashboard;
    expect(body.financialAvailability.status).toBe("available");
    expect(body.attention.overdueReceivablesCents).toBe(1230000);
    expect(body.revenue.closedSalesCents).toBe(74200000);
    expect(body.sales.grossMarginCents).toBe(9340000);
    expect(body.kpis.map((kpi) => kpi.label)).toContain("GMV fechado");
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
    exportExecutiveReport: vi.fn(async () => {
      throw new Error("Unexpected executive report request.");
    }),
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
