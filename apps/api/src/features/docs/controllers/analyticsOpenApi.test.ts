import { describe, expect, it } from "vitest";
import { analyticsSchemas } from "./analyticsOpenApi.js";
import { llmsText } from "./llmsText.js";

describe("analytics API documentation", () => {
  it("publishes the expanded permission-aware report response", () => {
    expect(analyticsSchemas.AnalyticsDashboard.properties).toMatchObject({
      crm: { $ref: "#/components/schemas/AnalyticsCrmReport" },
      documents: { $ref: "#/components/schemas/AnalyticsDocumentsReport" },
      finance: { $ref: "#/components/schemas/AnalyticsFinanceReport" },
      financialAvailability: {
        $ref: "#/components/schemas/AnalyticsReportAvailability",
      },
      marketing: { $ref: "#/components/schemas/AnalyticsMarketingReport" },
      owner: { $ref: "#/components/schemas/AnalyticsOwnerReport" },
    });
    expect(analyticsSchemas.AnalyticsDashboard.required).toEqual(
      expect.arrayContaining([
        "crm",
        "documents",
        "finance",
        "financialAvailability",
        "marketing",
        "owner",
      ]),
    );
    expect(analyticsSchemas.AnalyticsOwnerReport.required).toContain(
      "vehicles",
    );
    expect(analyticsSchemas.AnalyticsFinanceReport.required).toContain(
      "categoryBreakdown",
    );
    expect(analyticsSchemas.AnalyticsCrmReport.required).toContain(
      "interactionCount",
    );
    expect(analyticsSchemas.AnalyticsDocumentsReport.required).toContain(
      "byKind",
    );
    expect(analyticsSchemas.AnalyticsMarketingReport.required).toEqual([
      "availability",
    ]);
    expect(
      analyticsSchemas.AnalyticsDashboard.properties.revenue.properties
        .closedSalesCents.type,
    ).toEqual(["integer", "null"]);
    expect(
      analyticsSchemas.AnalyticsDashboard.properties.sales.properties
        .grossMarginCents.type,
    ).toEqual(["integer", "null"]);
  });

  it("keeps expanded reports out of the core home response", () => {
    expect(analyticsSchemas.HomeDashboard.properties).not.toHaveProperty(
      "owner",
    );
    expect(analyticsSchemas.HomeDashboard.properties).not.toHaveProperty(
      "finance",
    );
  });

  it("documents secondary report permissions and unavailable marketing data", () => {
    expect(llmsText).toContain(
      "Owner and finance data additionally require finance.read",
    );
    expect(llmsText).toContain(
      "Marketing reports unavailable until visit/click events are persisted",
    );
    expect(llmsText).toContain(
      "base revenue/ticket/margin/overdue values are null",
    );
  });
});
