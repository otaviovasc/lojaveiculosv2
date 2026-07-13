import { describe, expect, it, vi } from "vitest";
import type { SalesRepository } from "../../../domains/sales/ports/salesRepository.js";
import { createMemorySalesRepository } from "../adapters/memory/salesRepository.js";
import {
  completeDraft,
  context,
  createHarness,
} from "./salesWorkflowTransition.testSupport.js";

describe("sale draft update invariants", () => {
  it("authorizes before looking up a sale draft", async () => {
    const repository = createMemorySalesRepository();
    const findById = vi.spyOn(repository, "findById");
    const { services } = createHarness("available", repository);

    await expect(
      services.updateDraft(context([]), "sale_missing", {
        buyerSnapshot: { name: "Denied" },
      }),
    ).rejects.toThrow("Missing permission: sale.draft");
    expect(findById).not.toHaveBeenCalled();
  });

  it("rejects incoherent payment principal and extra amounts", async () => {
    const { services } = createHarness("available");
    const invalidPayment = {
      amountCents: 100000,
      extraCents: 10000,
      method: "pix" as const,
      principalCents: 100000,
    };

    await expect(
      services.createDraft(context(["sale.draft"]), {
        ...completeDraft(),
        payments: [invalidPayment],
      }),
    ).rejects.toMatchObject({ paymentIndex: 0 });
    const draft = await services.createDraft(
      context(["sale.draft"]),
      completeDraft(),
    );
    await expect(
      services.updateDraft(context(["sale.draft"]), draft.id, {
        payments: [invalidPayment],
      }),
    ).rejects.toMatchObject({ paymentIndex: 0 });
  });

  it("rejects replacing the vehicle unit after reservation", async () => {
    const { services } = createHarness("available");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [{ amountCents: 100000, method: "pix" }],
    });
    await services.transition(context(["sale.reserve"]), {
      saleId: draft.id,
      status: "pending",
    });

    await expect(
      services.updateDraft(context(["sale.draft"]), draft.id, {
        unitId: "another-unit",
      }),
    ).rejects.toThrow("vehicle unit cannot be changed");
  });

  it("rejects unknown persisted payment ids", async () => {
    const { services } = createHarness("available");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [{ amountCents: 100000, method: "pix" }],
    });

    await expect(
      services.updateDraft(context(["sale.draft"]), draft.id, {
        payments: [
          {
            amountCents: 100000,
            id: crypto.randomUUID(),
            method: "pix",
          },
        ],
      }),
    ).rejects.toMatchObject({ reason: "unknown" });
  });

  it("fails a stale update instead of mutating a concurrently closed sale", async () => {
    const inner = createMemorySalesRepository();
    let closeBeforeUpdate = false;
    const repository: SalesRepository = {
      ...inner,
      async updateDraft(scope, saleId, input, expectedStatus) {
        if (closeBeforeUpdate) {
          closeBeforeUpdate = false;
          await inner.transition({
            ...scope,
            expectedStatus: "draft",
            saleId,
            status: "closed",
          });
        }
        return inner.updateDraft(scope, saleId, input, expectedStatus);
      },
    };
    const { services } = createHarness("available", repository);
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
    });
    closeBeforeUpdate = true;

    await expect(
      services.updateDraft(context(["sale.draft"]), draft.id, {
        buyerSnapshot: { name: "Stale mutation" },
      }),
    ).rejects.toThrow("state changed");
    expect(
      await repository.findById(
        { storeId: "store_1", tenantId: "tenant_1" },
        draft.id,
      ),
    ).toMatchObject({ buyerSnapshot: draft.buyerSnapshot, status: "closed" });
  });
});
