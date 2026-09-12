import { describe, expect, it } from "vitest";
import { buildSaleAutoEntryEvents } from "./salesAutoEntryEvents.js";
import {
  financingPayment,
  saleRecord,
} from "./salesAutoEntryEvents.testSupport.js";

describe("sale automatic financing snapshots", () => {
  it("uses the aggregate financing snapshot for one active payment", () => {
    const events = buildSaleAutoEntryEvents(
      saleRecord(
        {
          financing: {
            financedAmountCents: 2_500_000,
            rank: "R4",
            status: "approved",
          },
        },
        [
          financingPayment("financing_1", 2_000_000, {
            financedAmountCents: 1_500_000,
            financingRank: "R2",
          }),
        ],
      ),
    );

    expect(
      events.find((event) => event.event === "financing_approved"),
    ).toMatchObject({
      attributes: { financingRank: "R4" },
      basisCents: { financing: 2_500_000 },
    });
  });

  it("treats R0 as an explicit no-financing-commission rank", () => {
    const events = buildSaleAutoEntryEvents(
      saleRecord({ financing: { rank: "R0", status: "approved" } }, [
        financingPayment("financing_r0", 3_000_000),
      ]),
    );

    expect(events.map((event) => event.event)).toEqual(["vehicle_sale_closed"]);
  });
});
