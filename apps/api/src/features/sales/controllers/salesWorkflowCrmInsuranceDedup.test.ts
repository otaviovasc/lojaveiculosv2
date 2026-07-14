import { expect, it } from "vitest";
import { materializeFinanceAutoEntries } from "../../../domains/finance/services/FinanceService/materializeFinanceAutoEntries.js";
import { createMemoryCrmRepository } from "../../crm/adapters/memory/crmRepository.js";
import { createCrmLeadFinancialProduct } from "../../crm/controllers/crmFinancialProducts.js";
import { createCrmServices } from "../../crm/controllers/crmServices.js";
import {
  completeDraft,
  context,
  createHarness,
} from "./salesWorkflowTransition.testSupport.js";

it("reuses CRM-first insurance executions when the linked sale closes", async () => {
  const crmRepository = createMemoryCrmRepository();
  const { financeAutoEntryRepository, services, vehiclePorts } = createHarness(
    "reserved",
    undefined,
    crmRepository,
  );
  const crmServices = createCrmServices({ ports: { crmRepository } });
  const lead = await crmServices.createLead(crmContext(["lead.create"]), {
    buyerName: "Maria",
    source: "manual",
  });
  const financialProductId = "11111111-1111-4111-8111-111111111111";
  const crmProduct = await createCrmLeadFinancialProduct(
    crmContext(["finance.create", "lead.update"]),
    lead.id,
    {
      appliedCommissionBasisPoints: 1_000,
      idempotencyKey: financialProductId,
      premiumCents: 120_000,
      sellerUserId: "seller_1",
      type: "insurance",
    },
    crmServices,
    {
      materializeAutoEntries: (serviceContext, input) =>
        materializeFinanceAutoEntries(serviceContext, input, {
          financeAutoEntryRepository,
          financeRepository: vehiclePorts.financeRepository,
        }),
    },
  );
  const insuranceEntries = () =>
    vehiclePorts.financeRepository.entries.filter(
      (entry) =>
        asRecord(entry.metadata.automaticFinanceEntry)?.event ===
        "insurance_issued",
    );
  expect(insuranceEntries()).toHaveLength(2);

  const draft = await services.createDraft(context(["sale.draft"]), {
    ...completeDraft(),
    leadId: lead.id,
    payments: [
      {
        amountCents: 5_000_000,
        method: "pix",
        principalCents: 5_000_000,
      },
    ],
    saleSourceSnapshot: {
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

  expect(insuranceEntries()).toHaveLength(2);
  expect(
    financeAutoEntryRepository.executions
      .filter((execution) => execution.sourceType === "insurance_issued")
      .map((execution) => execution.sourceId),
  ).toEqual([crmProduct.activity.id, crmProduct.activity.id]);
});

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function crmContext(permissions: string[]) {
  return Object.assign(context(permissions), { entitlements: ["crm"] });
}
