import {
  financeEntries,
  leadActivities,
  vehicleCosts,
} from "@lojaveiculosv2/db";
import { describe, expect, it } from "vitest";
import { createRuntimeAnalyticsServices } from "./runtimeAnalyticsServices.js";
import {
  createAnalyticsContext,
  createAnalyticsDb,
  renderSql,
  type SelectedQuery,
} from "./testSupportRuntimeAnalytics.js";

const PERIOD = { from: "2026-07-01", to: "2026-07-30" };

describe("runtime analytics reports", () => {
  it("maps DB-backed owner, finance, CRM, document, and marketing sections", async () => {
    const services = createRuntimeAnalyticsServices(createAnalyticsDb([]));

    const dashboard = await services.getDashboard(createAnalyticsContext(), {
      period: PERIOD,
    });

    expect(dashboard.owner).toMatchObject({
      availability: { status: "available" },
      completeSalesCount: 1,
      missingAcquisitionCount: 0,
      officialMarginCents: 2000000,
    });
    expect(dashboard.owner.vehicles[0]).toMatchObject({
      acquisitionCents: 12000000,
      commissionCents: 150000,
      marginCents: 2000000,
      operationalCostsCents: 500000,
      salePriceCents: 14650000,
      totalCostCents: 12650000,
    });
    expect(dashboard.finance).toMatchObject({
      availability: { status: "available" },
      paidOutflowCents: 800000,
      pendingOutflowCents: 300000,
      plannedOutflowCents: 1100000,
      plannedRevenueCents: 15000000,
      realizedBalanceCents: 13850000,
      receivedRevenueCents: 14650000,
    });
    expect(dashboard.crm).toMatchObject({
      availability: { status: "available" },
      averageInteractionsPerLead: 4,
      conversionRate: 50,
      interactionCount: 8,
      lostLeads: 1,
      totalLeads: 2,
      wonLeads: 1,
    });
    expect(dashboard.documents).toMatchObject({
      availability: { status: "available" },
      issued: 1,
      pendingSignature: 1,
      signed: 2,
      total: 4,
    });
    expect(dashboard.marketing.availability.status).toBe("unavailable");
  });

  it("excludes voided vehicle costs from the owner margin ledger", async () => {
    const selected: SelectedQuery[] = [];
    const services = createRuntimeAnalyticsServices(
      createAnalyticsDb(selected),
    );

    await services.getDashboard(createAnalyticsContext(), { period: PERIOD });

    const costQuery = selected.find((query) => query.table === vehicleCosts);
    if (!costQuery?.where)
      throw new Error("Vehicle cost query was not issued.");
    const predicate = renderSql(costQuery.where);
    expect(predicate.sql).toContain('"vehicle_costs"."status" =');
    expect(predicate.params).toContain("active");
    expect(predicate.params).not.toContain("voided");
  });

  it("attributes category payments by paid date and plans by due date", async () => {
    const selected: SelectedQuery[] = [];
    const services = createRuntimeAnalyticsServices(
      createAnalyticsDb(selected),
    );

    await services.getDashboard(createAnalyticsContext(), { period: PERIOD });

    const categoryQuery = selected.find(
      (query) =>
        query.table === financeEntries &&
        query.selectionKeys.includes("plannedCents"),
    );
    if (!categoryQuery?.where) {
      throw new Error("Finance category query was not issued.");
    }
    const paid = renderSql(categoryQuery.selection.paidCents);
    const planned = renderSql(categoryQuery.selection.plannedCents);
    const predicate = renderSql(categoryQuery.where);
    expect(paid.sql).toContain('"finance_entries"."paid_at" >=');
    expect(paid.sql).not.toContain('"finance_entries"."due_at" >=');
    expect(planned.sql).toContain('"finance_entries"."due_at" >=');
    expect(planned.sql).not.toContain('"finance_entries"."paid_at" >=');
    expect(predicate.sql).toContain('"finance_entries"."due_at" >=');
    expect(predicate.sql).toContain('"finance_entries"."paid_at" >=');
    expect(predicate.sql).toContain(" or ");
  });

  it("counts current interactions for leads created before the period", async () => {
    const selected: SelectedQuery[] = [];
    const services = createRuntimeAnalyticsServices(
      createAnalyticsDb(selected),
    );

    await services.getDashboard(createAnalyticsContext(), { period: PERIOD });

    const activityQuery = selected.find(
      (query) => query.table === leadActivities,
    );
    if (!activityQuery?.where) {
      throw new Error("Lead activity query was not issued.");
    }
    const predicate = renderSql(activityQuery.where);
    expect(predicate.sql).toContain('"lead_activities"."occurred_at" >=');
    expect(predicate.sql).not.toContain('"leads"."created_at" >=');
  });

  it("redacts every base financial metric without finance.read", async () => {
    const services = createRuntimeAnalyticsServices(createAnalyticsDb([]));

    const dashboard = await services.getDashboard(
      createAnalyticsContext([
        "analytics.read",
        "crm.pipeline.read",
        "documents.read",
      ]),
      { period: PERIOD },
    );

    expect(dashboard.financialAvailability.status).toBe("restricted");
    expect(dashboard.attention.overdueReceivablesCents).toBeNull();
    expect(dashboard.attention.overdueReceivablesCount).toBeNull();
    expect(dashboard.revenue).toEqual({
      closedSalesCents: null,
      openReceivablesCents: null,
      paidReceiptsCents: null,
    });
    expect(dashboard.sales).toMatchObject({
      avgTicketCents: null,
      grossMarginCents: null,
      revenueCents: null,
    });
    expect(dashboard.kpis.map((kpi) => kpi.label)).not.toContain("GMV fechado");
    expect(dashboard.kpis.map((kpi) => kpi.label)).not.toContain("Recebiveis");
  });
});
