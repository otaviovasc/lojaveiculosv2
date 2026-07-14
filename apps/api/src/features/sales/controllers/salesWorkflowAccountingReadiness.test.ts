import { describe, expect, it } from "vitest";
import { SaleReadinessError } from "../../../domains/sales/services/SalesService/serviceSupport.js";
import {
  completeDraft,
  context,
  createHarness,
} from "./salesWorkflowTransition.testSupport.js";

describe("sales workflow accounting readiness", () => {
  it("cannot override invalid terminal accounting facts", async () => {
    const { services, vehiclePorts } = createHarness("reserved");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [
        {
          amountCents: 5_000_000,
          method: "pix",
          principalCents: 5_000_000,
        },
      ],
      saleSourceSnapshot: {
        documentation: {
          chargedAmountCents: 0,
          hasLien: null,
          status: "charged",
        },
        financing: {
          financedAmountCents: 3_000_000,
          status: "approved",
        },
        insurance: {
          appliedCommissionPercentage: 0,
          premiumCents: 0,
          status: "issued",
        },
      },
    });

    const close = services.transition(
      context(["sale.close", "sale.override_required_fields"]),
      {
        overrideReason: "Fechar apesar dos campos obrigatórios",
        overrideRequiredFields: true,
        saleId: draft.id,
        status: "closed",
      },
    );

    await expect(close).rejects.toEqual(
      new SaleReadinessError([
        "financing_active_payment",
        "documentation_charged_amount",
        "documentation_has_lien",
        "insurance_premium",
        "insurance_commission_rate",
      ]),
    );
    expect(vehiclePorts.financeRepository.entries).toHaveLength(0);
    expect(vehiclePorts.units.get("unit_1")?.status).toBe("reserved");
    await expect(
      services.list(context(["sale.read"]), {
        limit: 10,
        offset: 0,
        status: "all",
      }),
    ).resolves.toEqual([
      expect.objectContaining({ id: draft.id, status: "draft" }),
    ]);
  });
});
