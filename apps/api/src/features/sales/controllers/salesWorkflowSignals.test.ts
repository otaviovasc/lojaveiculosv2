import { describe, expect, it } from "vitest";
import {
  completeDraft,
  context,
  createHarness,
} from "./salesWorkflowTransition.testSupport.js";

describe("sales workflow reservation signals", () => {
  it("uses an active positive-principal allocation as the reservation signal", async () => {
    const { services, vehiclePorts } = createHarness("available");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [
        {
          amountCents: 900000,
          method: "cash",
          principalCents: 900000,
          status: "cancelled",
        },
        {
          amountCents: 125000,
          method: "transfer",
          principalCents: 125000,
          status: "pending",
        },
      ],
    });

    const sale = await services.transition(context(["sale.reserve"]), {
      saleId: draft.id,
      status: "pending",
    });

    expect(sale.payments[1]?.metadata.reservationSignal).toBe(true);

    const [financeEntry] = vehiclePorts.financeRepository.entries;
    expect(financeEntry?.amountCents).toBe(125000);
    expect(financeEntry?.metadata.method).toBe("transfer");
    expect(
      vehiclePorts.financeRepository.links.find(
        (link) => link.targetType === "sale_payment",
      )?.targetId,
    ).toBe(sale.payments[1]?.id);
  });

  it("rejects zero-value reservation allocations", async () => {
    const { services } = createHarness("available");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [
        {
          amountCents: 0,
          method: "pix",
          principalCents: 0,
          status: "pending",
        },
      ],
    });

    await expect(
      services.transition(context(["sale.reserve"]), {
        saleId: draft.id,
        status: "pending",
      }),
    ).rejects.toMatchObject({
      missingFields: ["reservation_signal_payment"],
    });
  });

  it("preserves the actual reservation signal when payment rows are reordered", async () => {
    const { services } = createHarness("available");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [
        {
          amountCents: 900000,
          method: "cash",
          principalCents: 900000,
          status: "cancelled",
        },
        {
          amountCents: 125000,
          method: "transfer",
          principalCents: 125000,
        },
      ],
    });
    const reserved = await services.transition(context(["sale.reserve"]), {
      saleId: draft.id,
      status: "pending",
    });
    const cancelledPaymentId = reserved.payments[0]?.id;
    const signalPaymentId = reserved.payments[1]?.id;
    if (!cancelledPaymentId || !signalPaymentId) {
      throw new Error("Expected persisted reservation payment ids.");
    }

    const updated = await services.updateDraft(
      context(["sale.draft"]),
      draft.id,
      {
        ...completeDraft(),
        payments: [
          {
            amountCents: 999999,
            id: signalPaymentId,
            method: "credit_card",
            principalCents: 999999,
          },
          {
            amountCents: 900000,
            id: cancelledPaymentId,
            method: "cash",
            principalCents: 900000,
            status: "cancelled",
          },
        ],
      },
    );

    expect(updated.payments[0]).toMatchObject({
      amountCents: 125000,
      id: signalPaymentId,
      method: "transfer",
      principalCents: 125000,
      status: "pending",
    });
  });

  it("does not reuse a non-signal payment id for a new pending allocation", async () => {
    const { services } = createHarness("available");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [
        { amountCents: 125000, method: "pix", principalCents: 125000 },
        { amountCents: 200000, method: "cash", principalCents: 200000 },
      ],
    });
    const reserved = await services.transition(context(["sale.reserve"]), {
      saleId: draft.id,
      status: "pending",
    });
    const signalPaymentId = reserved.payments[0]?.id;
    const replacedPaymentId = reserved.payments[1]?.id;
    if (!signalPaymentId || !replacedPaymentId) {
      throw new Error("Expected persisted reservation payment ids.");
    }

    const updated = await services.updateDraft(
      context(["sale.draft"]),
      draft.id,
      {
        payments: [
          {
            amountCents: 125000,
            id: signalPaymentId,
            method: "pix",
            principalCents: 125000,
          },
          {
            amountCents: 300000,
            metadata: { reservationSignal: true },
            method: "transfer",
            principalCents: 300000,
          },
        ],
      },
    );

    expect(updated.payments[0]?.id).toBe(signalPaymentId);
    expect(updated.payments[1]?.id).not.toBe(replacedPaymentId);
    expect(updated.payments[1]).toMatchObject({
      amountCents: 300000,
      metadata: { reservationSignal: false },
      method: "transfer",
    });
  });
});
