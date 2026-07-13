import { describe, expect, it } from "vitest";
import { createMemoryAuditSink } from "../../../shared/auditSink.js";
import type { SaveSalePaymentInput } from "../../../domains/sales/ports/salesRepository.js";
import { closeSale } from "./salesReversion.testSupport.js";
import {
  completeDraft,
  context,
  createHarness,
} from "./salesWorkflowTransition.testSupport.js";

const irreversiblePayments = [
  {
    compensationReason: "paid",
    financeStatus: "paid",
    name: "paid allocations",
    payment: {
      amountCents: 5000000,
      method: "cash",
      paidAt: new Date("2026-07-12T12:00:00.000Z"),
      principalCents: 5000000,
      status: "paid",
    },
  },
  {
    compensationReason: "provider_managed",
    financeStatus: "pending",
    name: "active provider-managed allocations",
    payment: {
      amountCents: 5000000,
      method: "pix",
      principalCents: 5000000,
      providerPaymentId: "provider-payment-1",
      status: "pending",
    },
  },
] as const satisfies readonly {
  compensationReason: "paid" | "provider_managed";
  financeStatus: "paid" | "pending";
  name: string;
  payment: SaveSalePaymentInput;
}[];

describe("sale payment compensation guard", () => {
  it.each(irreversiblePayments)(
    "rejects closed-sale reversion for $name before local compensation",
    async ({ compensationReason, financeStatus, payment }) => {
      const audit = createMemoryAuditSink();
      const { services, vehiclePorts } = createHarness("reserved");
      const original = await closeSale(services, { payments: [payment] });
      const documentStatuses = [...vehiclePorts.documents.values()].map(
        ({ id, status }) => ({ id, status }),
      );

      await expect(
        services.revert(context(["sale.correct"], audit), {
          reason: "Correction requested",
          saleId: original.id,
        }),
      ).rejects.toMatchObject({ compensationReason });

      expect(vehiclePorts.units.get("unit_1")?.status).toBe("sold");
      expect(vehiclePorts.listings.get("listing_1")?.status).toBe("sold_out");
      expect(vehiclePorts.financeRepository.entries[0]?.status).toBe(
        financeStatus,
      );
      expect(
        [...vehiclePorts.documents.values()].map(({ id, status }) => ({
          id,
          status,
        })),
      ).toEqual(documentStatuses);
      await expectCurrentClosedRevision(services, original.id);
      expect(audit.events).toEqual([
        expect.objectContaining({
          action: "sale.revert.rejected",
          criticality: "critical",
          failureTier: "required",
          outcome: "failed",
        }),
      ]);
    },
  );

  it("rejects paid finance drift before mutating reversion artifacts", async () => {
    const { services, vehiclePorts } = createHarness("reserved");
    const original = await closeSale(services);
    const entry = vehiclePorts.financeRepository.entries[0];
    if (!entry) throw new Error("Expected a sale finance entry.");
    vehiclePorts.financeRepository.entries.splice(0, 1, {
      ...entry,
      paidAt: new Date("2026-07-12T12:00:00.000Z"),
      status: "paid",
    });

    await expect(
      services.revert(context(["sale.correct"]), {
        reason: "Correction requested",
        saleId: original.id,
      }),
    ).rejects.toMatchObject({ compensationReason: "paid" });

    expect(vehiclePorts.units.get("unit_1")?.status).toBe("sold");
    expect(vehiclePorts.financeRepository.entries[0]?.status).toBe("paid");
    expect(
      [...vehiclePorts.documents.values()].every(
        (document) => document.status !== "voided",
      ),
    ).toBe(true);
    await expectCurrentClosedRevision(services, original.id);
  });

  it("rejects ambiguous duplicate finance ownership before compensation", async () => {
    const { services, vehiclePorts } = createHarness("reserved");
    const original = await closeSale(services);
    const payment = original.payments[0];
    if (!payment) throw new Error("Expected a sale payment.");
    await vehiclePorts.financeRepository.createEntry({
      amountCents: payment.amountCents,
      category: "vehicle_sale",
      dueAt: null,
      links: [
        { targetId: original.id, targetType: "sale" },
        { targetId: payment.id, targetType: "sale_payment" },
        { targetId: "unit_1", targetType: "vehicle_unit" },
      ],
      metadata: { source: "vehicle_sale" },
      name: "Ambiguous duplicate sale entry",
      paidAt: null,
      sellerUserId: null,
      status: "pending",
      storeId: original.storeId,
      tenantId: original.tenantId,
      type: "revenue",
    });

    await expect(
      services.revert(context(["sale.correct"]), {
        reason: "Correction requested",
        saleId: original.id,
      }),
    ).rejects.toMatchObject({ compensation: "finance" });

    expect(vehiclePorts.units.get("unit_1")?.status).toBe("sold");
    expect(
      vehiclePorts.financeRepository.entries.every(
        (entry) => entry.status === "pending",
      ),
    ).toBe(true);
    expect(
      [...vehiclePorts.documents.values()].every(
        (document) => document.status !== "voided",
      ),
    ).toBe(true);
    await expectCurrentClosedRevision(services, original.id);
  });

  it("allows terminal provider rows while carrying only active local allocations", async () => {
    const { services } = createHarness("reserved");
    const original = await closeSale(services, {
      payments: [
        {
          amountCents: 5000000,
          method: "cash",
          principalCents: 5000000,
          status: "pending",
        },
        {
          amountCents: 100000,
          method: "pix",
          principalCents: 100000,
          providerPaymentId: "provider-refunded-1",
          status: "refunded",
        },
      ],
    });

    const correction = await services.revert(context(["sale.correct"]), {
      reason: "Correction after provider refund",
      saleId: original.id,
    });

    expect(correction.payments).toEqual([
      expect.objectContaining({
        method: "cash",
        providerPaymentId: null,
        status: "pending",
      }),
    ]);
  });

  it("keeps a provider-backed reservation intact when cancellation is rejected", async () => {
    const { services, vehiclePorts } = createHarness("available");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [
        {
          amountCents: 100000,
          method: "pix",
          principalCents: 100000,
          providerPaymentId: "provider-reservation-1",
        },
      ],
    });
    await services.transition(context(["sale.reserve"]), {
      saleId: draft.id,
      status: "pending",
    });

    await expect(
      services.transition(context(["sale.cancel"]), {
        saleId: draft.id,
        status: "cancelled",
      }),
    ).rejects.toMatchObject({ compensationReason: "provider_managed" });

    expect(vehiclePorts.units.get("unit_1")?.status).toBe("reserved");
    expect(vehiclePorts.financeRepository.entries[0]?.status).toBe("pending");
    const [sale] = await services.list(context(["sale.read"]), {
      limit: 10,
      offset: 0,
      status: "all",
    });
    expect(sale).toMatchObject({ id: draft.id, status: "pending" });
  });
});

async function expectCurrentClosedRevision(
  services: ReturnType<typeof createHarness>["services"],
  saleId: string,
) {
  const revisions = await services.list(context(["sale.read"]), {
    limit: 10,
    offset: 0,
    status: "all",
  });
  expect(revisions).toEqual([
    expect.objectContaining({
      id: saleId,
      isCurrentRevision: true,
      status: "closed",
    }),
  ]);
}
