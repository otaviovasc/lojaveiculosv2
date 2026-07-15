import { describe, expect, it } from "vitest";
import type { CreateFinanceAutoEntryRuleInput } from "../../../domains/finance/ports/financeAutoEntryRepository.js";
import {
  completeDraft,
  context,
  createHarness,
  expectFinanceLinkedToSale,
} from "./salesWorkflowTransition.testSupport.js";

describe("sales workflow automatic finance entries", () => {
  it("materializes every supported source without a finance-management permission and reverses them with the sale", async () => {
    const { financeAutoEntryRepository, services, vehiclePorts } =
      createHarness("reserved");
    await Promise.all([
      financeAutoEntryRepository.createRule(
        autoRule({
          calculation: { amountCents: 50_000, kind: "fixed" },
          event: "vehicle_sale_closed",
          name: "Comissão de fechamento",
          outputType: "commission",
        }),
      ),
      financeAutoEntryRepository.createRule(
        autoRule({
          calculation: {
            basis: "financing",
            basisPoints: 200,
            kind: "percentage",
          },
          event: "financing_approved",
          name: "Receita do financiamento",
          outputType: "revenue",
        }),
      ),
      financeAutoEntryRepository.createRule(
        autoRule({
          calculation: {
            basis: "premium",
            basisPoints: 500,
            kind: "percentage",
          },
          event: "insurance_issued",
          name: "Comissão do seguro",
          outputType: "commission",
        }),
      ),
    ]);
    const draft = await services.createDraft(context(["sale.draft"]), {
      ...completeDraft(),
      payments: [
        {
          amountCents: 5_000_000,
          dueAt: new Date("2026-07-14T12:00:00.000Z"),
          installments: 12,
          metadata: {
            financedAmountCents: 3_000_000,
            financingRank: "R1",
          },
          method: "financing",
          principalCents: 5_000_000,
        },
      ],
      saleSourceSnapshot: {
        commission: {
          enabled: true,
          percentageRate: 1.5,
          ruleType: "percentage",
        },
        documentation: {
          chargedAmountCents: 75_000,
          hasLien: false,
          status: "charged",
        },
        financing: {
          financedAmountCents: 3_000_000,
          rank: "R1",
          status: "approved",
        },
        insurance: {
          appliedCommissionPercentage: 10,
          premiumCents: 120_000,
          status: "issued",
        },
      },
    });

    await services.transition(context(["sale.close"]), {
      saleId: draft.id,
      status: "closed",
    });

    expect(vehiclePorts.financeRepository.entries).toHaveLength(10);
    expect(vehiclePorts.financeRepository.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          amountCents: 50_000,
          name: "Comissão de fechamento",
          type: "commission",
        }),
        expect.objectContaining({
          amountCents: 60_000,
          name: "Receita do financiamento",
          type: "revenue",
        }),
        expect.objectContaining({
          amountCents: 6_000,
          name: "Comissão do seguro",
          type: "commission",
        }),
        expect.objectContaining({
          amountCents: 75_000,
          name: "Comissão padrão da venda",
          type: "commission",
        }),
        expect.objectContaining({
          amountCents: 36_000,
          name: "Receita da loja no financiamento R1",
          type: "revenue",
        }),
        expect.objectContaining({
          amountCents: 6_000,
          name: "Receita da loja no seguro",
          type: "revenue",
        }),
        expect.objectContaining({
          amountCents: 900,
          name: "Comissão do vendedor no seguro",
          type: "commission",
        }),
        expect.objectContaining({
          amountCents: 50_000,
          name: "Custo de transferência sem gravame",
          type: "expense",
        }),
        expect.objectContaining({
          amountCents: 75_000,
          name: "Receita de documentação",
          type: "revenue",
        }),
      ]),
    );
    expect(
      vehiclePorts.financeRepository.entries.filter(
        (entry) => entry.metadata.automaticFinanceEntry,
      ),
    ).toHaveLength(9);
    expect(
      vehiclePorts.financeRepository.entries.find(
        (entry) => entry.name === "Receita da loja no financiamento R1",
      )?.metadata.automaticFinanceEntry,
    ).toMatchObject({
      event: "financing_approved",
      sourceId: draft.payments[0]?.id,
    });
    expect(
      vehiclePorts.financeRepository.entries.find(
        (entry) => entry.name === "Receita de documentação",
      )?.metadata.automaticFinanceEntry,
    ).toMatchObject({
      event: "transfer_documentation_charged",
      sourceId: draft.id,
    });
    expectFinanceLinkedToSale(vehiclePorts, draft.id);

    const correction = await services.revert(context(["sale.correct"]), {
      reason: "Corrigir os termos da venda",
      saleId: draft.id,
    });
    expect(correction.revision).toBe(2);
    expect(
      vehiclePorts.financeRepository.entries.every(
        (entry) => entry.status === "cancelled",
      ),
    ).toBe(true);
  });
});

function autoRule(
  input: Pick<
    CreateFinanceAutoEntryRuleInput,
    "calculation" | "event" | "name" | "outputType"
  >,
): CreateFinanceAutoEntryRuleInput {
  return {
    ...input,
    category: "Automático",
    conditions: {},
    family: null,
    metadata: {},
    priority: 50,
    recipient: { kind: "event_seller" },
    resolution: "additive",
    ruleKey: null,
    sellerUserId: null,
    status: "active",
    storeId: "store_1",
    tenantId: "tenant_1",
    timing: { kind: "same_day" },
  };
}
