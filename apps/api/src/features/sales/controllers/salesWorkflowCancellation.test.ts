import { describe, expect, it, vi } from "vitest";
import type { SalesRepository } from "../../../domains/sales/ports/salesRepository.js";
import { createMemorySalesRepository } from "../adapters/memory/salesRepository.js";
import {
  completeDraft,
  context,
  createHarness,
} from "./salesWorkflowTransition.testSupport.js";

describe("sales workflow cancellation", () => {
  it("does not release or audit a reservation after a stale cancellation", async () => {
    const inner = createMemorySalesRepository();
    let closeBeforeCancellation = false;
    const repository: SalesRepository = {
      ...inner,
      async transition(input) {
        if (closeBeforeCancellation && input.status === "cancelled") {
          closeBeforeCancellation = false;
          await inner.transition({
            ...input,
            expectedStatus: "pending",
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
    await services.transition(context(["sale.reserve"]), {
      saleId: draft.id,
      status: "pending",
    });
    closeBeforeCancellation = true;
    const audit = { record: vi.fn(async () => undefined) };

    await expect(
      services.transition(context(["sale.cancel"], audit), {
        saleId: draft.id,
        status: "cancelled",
      }),
    ).rejects.toThrow("state changed");

    expect(vehiclePorts.units.get("unit_1")?.status).toBe("reserved");
    expect(vehiclePorts.financeRepository.entries[0]?.status).toBe("pending");
    expect(audit.record).not.toHaveBeenCalled();
  });
});
