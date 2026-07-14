import { describe, expect, it } from "vitest";
import type { SaleReversionCompensationError } from "../../../domains/sales/services/SalesService/serviceSupport.js";
import {
  completeDraft,
  context,
  createHarness,
} from "./salesWorkflowTransition.testSupport.js";

describe("sale automatic finance entry reversion provenance", () => {
  it("rejects an aggregate sale source for a financing auto-entry", async () => {
    const { services, vehiclePorts } = createHarness("reserved");
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [
        {
          amountCents: 5_000_000,
          method: "financing",
          principalCents: 5_000_000,
        },
      ],
      saleSourceSnapshot: {
        financing: { rank: "R1", status: "approved" },
      },
    });
    await services.transition(context(["sale.close"]), {
      saleId: draft.id,
      status: "closed",
    });
    const financingEntry = vehiclePorts.financeRepository.entries.find(
      (entry) => entry.name === "Receita da loja no financiamento R1",
    );
    if (!financingEntry) throw new Error("Expected financing auto-entry.");
    const provenance = financingEntry.metadata.automaticFinanceEntry;
    if (!provenance || typeof provenance !== "object") {
      throw new Error("Expected automatic finance entry provenance.");
    }
    await vehiclePorts.financeRepository.updateEntry({
      entryId: financingEntry.id,
      metadata: {
        ...financingEntry.metadata,
        automaticFinanceEntry: { ...provenance, sourceId: draft.id },
      },
      storeId: financingEntry.storeId,
      tenantId: financingEntry.tenantId,
    });

    const revert = services.revert(context(["sale.correct"]), {
      reason: "Validar proveniência do financiamento",
      saleId: draft.id,
    });

    await expect(revert).rejects.toMatchObject({
      compensation: "finance",
      name: "SaleReversionCompensationError",
    } satisfies Partial<SaleReversionCompensationError>);
    expect(
      vehiclePorts.financeRepository.entries.every(
        (entry) => entry.status !== "cancelled",
      ),
    ).toBe(true);
  });
});
