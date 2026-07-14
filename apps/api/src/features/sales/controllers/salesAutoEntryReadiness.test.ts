import { describe, expect, it } from "vitest";
import { SaleReadinessError } from "../../../domains/sales/services/SalesService/serviceSupport.js";
import { buildSaleAutoEntryEvents } from "./salesAutoEntryEvents.js";
import {
  financingPayment,
  saleRecord,
} from "./salesAutoEntryEvents.testSupport.js";

describe("sale automatic finance event readiness", () => {
  it.each([
    {
      expected: ["financing_active_payment"],
      name: "approved financing backed only by a sale-level aggregate",
      sale: saleRecord({
        financing: {
          financedAmountCents: 3_000_000,
          status: "approved",
        },
      }),
    },
    {
      expected: ["financing_payment_amount:financing_zero"],
      name: "an active financing payment without a positive amount",
      sale: saleRecord({ financing: { status: "approved" } }, [
        financingPayment("financing_zero", 0),
      ]),
    },
    {
      expected: ["documentation_charged_amount", "documentation_has_lien"],
      name: "charged documentation without amount and lien decision",
      sale: saleRecord({
        documentation: {
          chargedAmountCents: 0,
          hasLien: null,
          status: "charged",
        },
      }),
    },
    {
      expected: ["insurance_premium", "insurance_commission_rate"],
      name: "issued insurance without a positive premium and valid rate",
      sale: saleRecord({
        insurance: {
          appliedCommissionPercentage: 0,
          premiumCents: 0,
          status: "issued",
        },
      }),
    },
    {
      expected: ["insurance_commission_amount"],
      name: "issued insurance whose commission rounds to zero",
      sale: saleRecord({
        insurance: {
          appliedCommissionPercentage: 10,
          premiumCents: 1,
          status: "issued",
        },
      }),
    },
  ])("rejects $name", ({ expected, sale }) => {
    expect(readReadinessFields(sale)).toEqual(expected);
  });
});

function readReadinessFields(
  sale: ReturnType<typeof saleRecord>,
): readonly string[] {
  try {
    buildSaleAutoEntryEvents(sale);
  } catch (error) {
    if (error instanceof SaleReadinessError) return error.missingFields;
    throw error;
  }
  throw new Error("Expected SaleReadinessError.");
}
