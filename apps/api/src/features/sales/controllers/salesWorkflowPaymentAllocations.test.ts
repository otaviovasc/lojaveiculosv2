import { salePaymentMethods } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import {
  completeDraft,
  context,
  createHarness,
} from "./salesWorkflowTransition.testSupport.js";

describe("sales workflow payment allocations", () => {
  it.each(salePaymentMethods)(
    "preserves the %s allocation contract through sale close",
    async (method) => {
      const { services, vehiclePorts } = createHarness("reserved");
      const paidAt = new Date("2026-07-10T14:30:00.000Z");
      const dueAt = new Date("2026-07-09T12:00:00.000Z");
      const draft = await services.createDraft(context(["sale.draft"]), {
        ...completeDraft(),
        payments: [
          {
            amountCents: 5000000,
            dueAt,
            method,
            paidAt,
            principalCents: 5000000,
            status: "paid",
          },
        ],
      });

      await services.transition(context(["sale.close"]), {
        saleId: draft.id,
        status: "closed",
      });

      const [financeEntry] = vehiclePorts.financeRepository.entries;
      expect(financeEntry).toMatchObject({
        amountCents: 5000000,
        dueAt,
        paidAt,
        status: "paid",
      });
      expect(financeEntry?.metadata).toMatchObject({
        method,
        salePaymentStatus: "paid",
      });
    },
  );

  it("creates finance entries only for active allocations in a mixed split", async () => {
    const { services, vehiclePorts } = createHarness("reserved");
    const paidAt = new Date("2026-07-10T14:30:00.000Z");
    const dueAt = new Date("2026-08-10T14:30:00.000Z");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [
        {
          amountCents: 1000000,
          method: "cash",
          paidAt,
          principalCents: 1000000,
          status: "paid",
        },
        {
          amountCents: 4000000,
          dueAt,
          installments: 12,
          method: "financing",
          principalCents: 4000000,
          status: "pending",
        },
        {
          amountCents: 7000000,
          method: "pix",
          principalCents: 7000000,
          status: "cancelled",
        },
        {
          amountCents: 8000000,
          method: "boleto",
          principalCents: 8000000,
          status: "refunded",
        },
      ],
    });

    await services.transition(context(["sale.close"]), {
      saleId: draft.id,
      status: "closed",
    });

    expect(vehiclePorts.financeRepository.entries).toHaveLength(2);
    const cashEntry = vehiclePorts.financeRepository.entries.find(
      (entry) => entry.metadata.method === "cash",
    );
    expect(cashEntry).toMatchObject({
      amountCents: 1000000,
      paidAt,
      status: "paid",
    });
    expect(cashEntry?.metadata).toMatchObject({
      method: "cash",
      salePaymentStatus: "paid",
    });
    const financingEntry = vehiclePorts.financeRepository.entries.find(
      (entry) => entry.metadata.method === "financing",
    );
    expect(financingEntry).toMatchObject({
      amountCents: 4000000,
      dueAt,
      status: "pending",
    });
    expect(financingEntry?.metadata).toMatchObject({
      installments: 12,
      method: "financing",
      salePaymentStatus: "pending",
    });
  });

  it("keeps full principal coverage required when closing a sale", async () => {
    const { services } = createHarness("reserved");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [
        {
          amountCents: 100000,
          method: "pix",
          principalCents: 100000,
        },
        {
          amountCents: 6000000,
          method: "cash",
          principalCents: 6000000,
          status: "cancelled",
        },
        {
          amountCents: 6000000,
          method: "boleto",
          principalCents: 6000000,
          status: "refunded",
        },
      ],
    });

    const error = await services
      .transition(context(["sale.close"]), {
        saleId: draft.id,
        status: "closed",
      })
      .then(
        () => null,
        (caught: unknown) => caught,
      );
    const missingFields =
      error && typeof error === "object" && "missingFields" in error
        ? error.missingFields
        : null;

    if (!Array.isArray(missingFields)) {
      throw new Error("Expected sale readiness missing fields.");
    }
    expect(missingFields).toContain("payment_principal_coverage");
  });
});
