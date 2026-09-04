import {
  financeEntries,
  sales,
  vehicleListings,
  vehicleUnits,
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

describe("runtime analytics period semantics", () => {
  it("counts only current closed-sale revisions from the selected period", async () => {
    const selected: SelectedQuery[] = [];
    const services = createRuntimeAnalyticsServices(
      createAnalyticsDb(selected),
    );

    await services.getDashboard(createAnalyticsContext(), { period: PERIOD });

    const revenueQuery = selected.find(
      (query) =>
        query.table === sales &&
        query.selectionKeys.includes("closedSalesCents"),
    );
    if (!revenueQuery?.where) throw new Error("Revenue query was not issued.");
    const predicate = renderSql(revenueQuery.where);
    expect(predicate.sql).toContain('"sales"."closed_at" >=');
    expect(predicate.sql).toContain('"sales"."closed_at" <');
    expect(predicate.sql).toContain('"sales"."is_current_revision" =');
    expect(predicate.params).toContain("closed");
    expect(predicate.params).toContain(true);
  });

  it("defines open receivables by due date and paid receipts by paid date", async () => {
    const selected: SelectedQuery[] = [];
    const services = createRuntimeAnalyticsServices(
      createAnalyticsDb(selected),
    );

    await services.getDashboard(createAnalyticsContext(), { period: PERIOD });

    const financeQuery = selected.find(
      (query) =>
        query.table === financeEntries &&
        query.selectionKeys.includes("openReceivablesCents"),
    );
    if (!financeQuery) throw new Error("Revenue finance query was not issued.");
    const open = renderSql(financeQuery.selection.openReceivablesCents);
    const paid = renderSql(financeQuery.selection.paidReceiptsCents);
    expect(open.sql).toContain('"finance_entries"."due_at" >=');
    expect(open.sql).not.toContain('"finance_entries"."paid_at" >=');
    expect(paid.sql).toContain('"finance_entries"."paid_at" >=');
    expect(paid.sql).not.toContain('"finance_entries"."due_at" >=');
  });

  it("sums one asking price per published listing, not per available unit", async () => {
    const selected: SelectedQuery[] = [];
    const services = createRuntimeAnalyticsServices(
      createAnalyticsDb(selected),
    );

    await services.getDashboard(createAnalyticsContext(), { period: PERIOD });

    const listingQuery = selected.find(
      (query) =>
        query.table === vehicleListings &&
        query.selectionKeys.includes("availableAskingValueCents"),
    );
    if (!listingQuery) throw new Error("Listing value query was not issued.");
    const value = renderSql(listingQuery.selection.availableAskingValueCents);
    expect(value.sql).toContain('sum("vehicle_listings"."asking_price_cents")');
    expect(value.sql).toContain("status\" = 'published'");
    expect(
      selected.some(
        (query) =>
          query.table === vehicleUnits &&
          query.selectionKeys.includes("availableAskingValueCents"),
      ),
    ).toBe(false);
  });
});
