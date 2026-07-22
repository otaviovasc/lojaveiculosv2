import { describe, expect, it, vi } from "vitest";
import type { SalesRepository } from "../../../domains/sales/ports/salesRepository.js";
import { createMemorySalesRepository } from "../adapters/memory/salesRepository.js";
import {
  completeDraft,
  context,
  createHarness,
  expectFinanceLinkedToSale,
} from "./salesWorkflowTransition.testSupport.js";

describe("sales workflow transition", () => {
  it("authorizes cancellation before looking up the sale", async () => {
    const repository = createMemorySalesRepository();
    const findById = vi.spyOn(repository, "findById");
    const { services } = createHarness("available", repository);

    await expect(
      services.transition(context([]), {
        saleId: "sale_missing",
        status: "cancelled",
      }),
    ).rejects.toThrow("Missing permission: sale.cancel");
    expect(findById).not.toHaveBeenCalled();
  });

  it("reserves a sales draft through the canonical vehicle workflow", async () => {
    const { services, vehiclePorts } = createHarness("available");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [
        {
          amountCents: 100000,
          method: "pix",
          principalCents: 100000,
        },
      ],
    });

    const sale = await services.transition(context(["sale.reserve"]), {
      saleId: draft.id,
      status: "pending",
    });

    expect(sale.id).toBe(draft.id);
    expect(sale.status).toBe("pending");
    expect(vehiclePorts.listings.get("listing_1")?.status).toBe("published");
    expect(vehiclePorts.units.get("unit_1")?.status).toBe("reserved");
    expect(vehiclePorts.documents.size).toBe(1);
    expect(vehiclePorts.financeRepository.entries).toHaveLength(1);
    expect(vehiclePorts.financeRepository.entries[0]?.amountCents).toBe(100000);
    expect(vehiclePorts.operationsRepository.statuses).toHaveLength(1);
    expect(vehiclePorts.salesRepository.sales).toHaveLength(0);
    expectFinanceLinkedToSale(vehiclePorts, draft.id);
  });

  it("closes a sales draft through the canonical vehicle workflow", async () => {
    const { services, vehiclePorts } = createHarness("reserved");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [
        {
          amountCents: 5000000,
          dueAt: new Date("2026-07-14T12:00:00.000Z"),
          method: "pix",
          principalCents: 5000000,
        },
      ],
    });

    const sale = await services.transition(context(["sale.close"]), {
      saleId: draft.id,
      status: "closed",
    });

    expect(sale.id).toBe(draft.id);
    expect(sale.status).toBe("closed");
    expect(vehiclePorts.listings.get("listing_1")?.status).toBe("sold_out");
    expect(vehiclePorts.units.get("unit_1")?.status).toBe("sold");
    expect(vehiclePorts.documents.size).toBe(5);
    expect(vehiclePorts.financeRepository.entries).toHaveLength(1);
    expect(vehiclePorts.financeRepository.entries[0]?.amountCents).toBe(
      5000000,
    );
    expect(vehiclePorts.financeRepository.entries[0]?.status).toBe("pending");
    expect(vehiclePorts.operationsRepository.statuses).toHaveLength(2);
    expect(vehiclePorts.salesRepository.sales).toHaveLength(0);
    expectFinanceLinkedToSale(vehiclePorts, draft.id);
  });

  it("cancels a pending sales reservation through the canonical release workflow", async () => {
    const { services, vehiclePorts } = createHarness("available");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [
        {
          amountCents: 100000,
          method: "pix",
          principalCents: 100000,
        },
      ],
    });
    await services.transition(context(["sale.reserve"]), {
      saleId: draft.id,
      status: "pending",
    });

    const sale = await services.transition(context(["sale.cancel"]), {
      overrideReason: "Cliente desistiu",
      saleId: draft.id,
      status: "cancelled",
    });

    expect(sale.status).toBe("cancelled");
    expect(sale.payments[0]?.status).toBe("cancelled");
    expect(vehiclePorts.listings.get("listing_1")?.status).toBe("published");
    expect(vehiclePorts.units.get("unit_1")?.status).toBe("available");
    expect(vehiclePorts.financeRepository.entries[0]?.status).toBe("cancelled");
    expect(vehiclePorts.financeRepository.entries[0]?.metadata).toMatchObject({
      cancelledReason: "Cliente desistiu",
      reservationOutcome: "cancel",
    });
    expect(vehiclePorts.operationsRepository.statuses).toHaveLength(2);
  });

  it("fails closed when a required sale lifecycle audit cannot be stored", async () => {
    const { services } = createHarness("available");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [{ amountCents: 100000, method: "pix" }],
    });
    const auditError = new Error("audit database unavailable");
    const audit = { record: vi.fn(async () => Promise.reject(auditError)) };

    await expect(
      services.transition(context(["sale.reserve"], audit), {
        saleId: draft.id,
        status: "pending",
      }),
    ).rejects.toThrow(auditError);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "sale.pending",
        criticality: "critical",
        failureTier: "required",
      }),
    );
  });

  it("fails a stale transition instead of running a second vehicle workflow", async () => {
    const inner = createMemorySalesRepository();
    let closeBeforeTransition = true;
    const repository: SalesRepository = {
      ...inner,
      async transition(input) {
        if (closeBeforeTransition) {
          closeBeforeTransition = false;
          await inner.transition({
            ...input,
            expectedStatus: "draft",
            status: "closed",
          });
        }
        return inner.transition(input);
      },
    };
    const { services, vehiclePorts } = createHarness("available", repository);
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [{ amountCents: 100000, method: "pix" }],
    });

    await expect(
      services.transition(context(["sale.reserve"]), {
        saleId: draft.id,
        status: "pending",
      }),
    ).rejects.toThrow("state changed");
    expect(vehiclePorts.units.get("unit_1")?.status).toBe("available");
    expect(vehiclePorts.documents.size).toBe(0);
    expect(vehiclePorts.financeRepository.entries).toHaveLength(0);
  });

  it("rejects lifecycle transitions after terminal sale states", async () => {
    const closedHarness = createHarness("available");
    const closedDraft = await closedHarness.services.createDraft(
      context(["sale.draft"]),
      {
        ...completeDraft(),
        payments: [
          {
            amountCents: 5000000,
            dueAt: new Date("2026-07-14T12:00:00.000Z"),
            method: "pix",
            principalCents: 5000000,
          },
        ],
      },
    );
    const closed = await closedHarness.services.transition(
      context(["sale.close"]),
      {
        saleId: closedDraft.id,
        status: "closed",
      },
    );

    await expect(
      closedHarness.services.transition(
        context(["inventory.reserve", "sale.cancel"]),
        {
          saleId: closed.id,
          status: "cancelled",
        },
      ),
    ).rejects.toThrow("Sale cannot transition from closed to cancelled.");
    await expect(
      closedHarness.services.transition(context(["sale.reserve"]), {
        saleId: closed.id,
        status: "pending",
      }),
    ).rejects.toThrow("Sale cannot transition from closed to pending.");

    const cancelledHarness = createHarness("available");
    const cancelledDraft = await cancelledHarness.services.createDraft(
      context(["sale.draft"]),
      completeDraft(),
    );
    const cancelled = await cancelledHarness.services.transition(
      context(["sale.cancel"]),
      {
        saleId: cancelledDraft.id,
        status: "cancelled",
      },
    );

    await expect(
      cancelledHarness.services.transition(context(["sale.close"]), {
        saleId: cancelled.id,
        status: "closed",
      }),
    ).rejects.toThrow("Sale cannot transition from cancelled to closed.");
  });
});
