import { describe, expect, it } from "vitest";
import { buildSaleAutoEntryEvents } from "./salesAutoEntryEvents.js";
import {
  financingPayment,
  saleRecord,
} from "./salesAutoEntryEvents.testSupport.js";

describe("sale automatic finance events", () => {
  it("emits typed sale, financing, documentation, and insurance facts", () => {
    const sale = saleRecord(
      {
        commission: {
          enabled: true,
          percentageRate: 1.5,
          ruleType: "percentage",
        },
        documentation: {
          chargedAmountCents: 75_000,
          hasLien: true,
          status: "charged",
        },
        financing: {
          financedAmountCents: 3_000_000,
          rank: "R4",
          status: "approved",
        },
        insurance: {
          appliedCommissionPercentage: 12.5,
          premiumCents: 120_000,
          status: "issued",
        },
      },
      [
        financingPayment("payment_financing", 2_750_000, {
          financedAmountCents: 3_000_000,
          financingRank: "R2",
        }),
      ],
    );

    expect(buildSaleAutoEntryEvents(sale)).toEqual([
      expect.objectContaining({
        attributes: { standardCommissionEnabled: true },
        basisCents: { commission: 75_000, sale: 5_000_000 },
        event: "vehicle_sale_closed",
        metadata: {
          origin: "sales_workflow",
          standardCommission: {
            calculatedAmountCents: 75_000,
            percentageRate: 1.5,
            ruleType: "percentage",
          },
        },
      }),
      expect.objectContaining({
        attributes: { financingRank: "R2" },
        basisCents: { financing: 3_000_000 },
        event: "financing_approved",
        sourceId: "payment_financing",
      }),
      expect.objectContaining({
        attributes: { transferHasLien: true },
        basisCents: { documentation: 75_000 },
        event: "transfer_documentation_charged",
      }),
      expect.objectContaining({
        basisCents: {
          insurance_commission: 15_000,
          premium: 120_000,
        },
        event: "insurance_issued",
        metadata: {
          appliedCommissionBasisPoints: 1_250,
          appliedCommissionPercentage: 12.5,
          origin: "sales_workflow",
        },
      }),
    ]);
    expect(buildSaleAutoEntryEvents(sale)[0]).toMatchObject({
      occurredAt: new Date("2026-07-13T12:00:00.000Z"),
      saleId: "sale_1",
      sellerUserId: "seller_1",
      sourceId: "sale_1",
      sourceRevision: 3,
      unitId: "unit_1",
    });
  });

  it("does not claim source events without their terminal status and basis", () => {
    const events = buildSaleAutoEntryEvents(
      saleRecord({
        documentation: { chargedAmountCents: 75_000, status: "pending" },
        financing: { financedAmountCents: 3_000_000, status: "pending" },
        insurance: { premiumCents: 0, status: "pending" },
      }),
    );

    expect(events.map((event) => event.event)).toEqual(["vehicle_sale_closed"]);
  });

  it("uses V1 fallbacks without treating a manual commission override as a rule", () => {
    const events = buildSaleAutoEntryEvents(
      saleRecord(
        {
          commission: {
            amountValueCents: 80_000,
            enabled: false,
            ruleType: "fixed",
          },
          financing: {
            status: "approved",
          },
          insurance: {
            appliedCommissionPercentage: 10,
            premiumCents: 120_000,
            status: "issued",
          },
        },
        [financingPayment("financing_default_rank", 3_000_000)],
      ),
    );

    expect(events[0]?.metadata).toEqual({ origin: "sales_workflow" });
    expect(events[0]?.attributes).toEqual({
      standardCommissionEnabled: false,
    });
    expect(events[1]?.attributes).toEqual({ financingRank: "R1" });
    expect(events[2]).toMatchObject({
      basisCents: {
        insurance_commission: 12_000,
        premium: 120_000,
      },
      metadata: {
        appliedCommissionBasisPoints: 1_000,
        appliedCommissionPercentage: 10,
        origin: "sales_workflow",
      },
    });
  });

  it("only exposes a positive explicit standard commission basis", () => {
    const fixed = buildSaleAutoEntryEvents(
      saleRecord({
        commission: {
          amountValueCents: 80_000,
          enabled: true,
          ruleType: "fixed",
        },
      }),
    )[0];
    const roundedToZero = buildSaleAutoEntryEvents({
      ...saleRecord({
        commission: {
          enabled: true,
          percentageRate: 0.01,
          ruleType: "percentage",
        },
      }),
      salePriceCents: 1,
    })[0];

    expect(fixed).toMatchObject({
      basisCents: { commission: 80_000, sale: 5_000_000 },
      metadata: {
        standardCommission: {
          amountCents: 80_000,
          calculatedAmountCents: 80_000,
          ruleType: "fixed",
        },
      },
    });
    expect(roundedToZero?.basisCents).toEqual({ sale: 1 });
    expect(roundedToZero?.attributes).toEqual({
      standardCommissionEnabled: true,
    });
    expect(roundedToZero?.metadata).toEqual({ origin: "sales_workflow" });
  });

  it("emits one financing event per active financing payment", () => {
    const sale = saleRecord(
      {
        financing: { rank: "R3", status: "approved" },
      },
      [
        financingPayment("financing_1", 1_000_000),
        financingPayment("financing_2", 2_000_000, {
          financingRank: "R5",
        }),
        {
          ...financingPayment("financing_cancelled", 3_000_000),
          status: "cancelled",
        },
      ],
    );

    expect(
      buildSaleAutoEntryEvents(sale)
        .filter((event) => event.event === "financing_approved")
        .map((event) => ({
          amount: event.basisCents.financing,
          rank: event.attributes?.financingRank,
          sourceId: event.sourceId,
        })),
    ).toEqual([
      { amount: 1_000_000, rank: "R3", sourceId: "financing_1" },
      { amount: 2_000_000, rank: "R5", sourceId: "financing_2" },
    ]);
  });

  it("falls back to the sale update time when closedAt is unavailable", () => {
    const sale = { ...saleRecord({}), closedAt: null };

    expect(buildSaleAutoEntryEvents(sale)[0]?.occurredAt).toEqual(
      sale.updatedAt,
    );
  });
});
