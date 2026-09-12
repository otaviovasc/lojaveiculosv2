import { describe, expect, it, vi } from "vitest";
import type { AuditEvent } from "@lojaveiculosv2/audit";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { AgencyStatsReport } from "../../ports/agencyStatsRepository.js";
import { getAgencyStats } from "./getAgencyStats.js";

const report: AgencyStatsReport = {
  availableStores: [],
  generatedAt: new Date("2026-08-22T12:00:00.000Z"),
  leadSources: [],
  period: { from: "2026-08-01", to: "2026-08-22" },
  scopeStoreId: null,
  stores: [],
  tenantId: "tenant_1",
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

describe("getAgencyStats", () => {
  it("reads tenant-scoped statistics with permission and audit", async () => {
    const audit = { record: vi.fn(async (_event: AuditEvent) => undefined) };
    const repository = { getStats: vi.fn(async () => report) };
    const context = createServiceContext({
      actor: { id: "user_agency", kind: "user" },
      audit,
      permissions: ["analytics.read"],
      request: { requestId: "req_stats" },
      tenantId: "tenant_1",
    });

    await expect(
      getAgencyStats(
        context,
        { agencyStatsRepository: repository },
        {
          period: report.period,
        },
      ),
    ).resolves.toBe(report);

    expect(repository.getStats).toHaveBeenCalledWith({
      period: report.period,
      tenantId: "tenant_1",
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "agency.stats.read",
        storeId: null,
        tenantId: "tenant_1",
      }),
    );
  });

  it("rejects missing analytics permission before repository access", async () => {
    const repository = { getStats: vi.fn(async () => report) };
    const context = createServiceContext({
      actor: { id: "user_agency", kind: "user" },
      permissions: ["store.manage"],
      request: { requestId: "req_denied" },
      tenantId: "tenant_1",
    });

    await expect(
      getAgencyStats(
        context,
        { agencyStatsRepository: repository },
        {
          period: report.period,
        },
      ),
    ).rejects.toThrow("Missing permission: analytics.read");
    expect(repository.getStats).not.toHaveBeenCalled();
  });

  it("rejects store-scoped contexts on the agency aggregate route", async () => {
    const context = createServiceContext({
      actor: { id: "user_agency", kind: "user" },
      permissions: ["analytics.read"],
      request: { requestId: "req_bad_scope" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    await expect(
      getAgencyStats(
        context,
        {
          agencyStatsRepository: { getStats: vi.fn(async () => report) },
        },
        { period: report.period },
      ),
    ).rejects.toThrow("tenant scope without a store scope");
  });
});
