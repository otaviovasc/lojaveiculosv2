import { financeAutoEntryMaxAmountCents } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import { createTestDocumentRepository } from "../../../documents/testSupportDocumentRepository.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createTestFinanceAutoEntryRepository } from "../../testSupportFinanceAutoEntryRepository.js";
import { createTestFinanceRepository } from "../../testSupportFinanceRepository.js";
import { createFinanceAutoEntryRule } from "./createFinanceAutoEntryRule.js";
import { deactivateFinanceAutoEntryRule } from "./deactivateFinanceAutoEntryRule.js";
import { FinanceAutoEntryRuleValidationError } from "./financeAutoEntryRuleValidation.js";
import type { FinanceServicePorts } from "./serviceSupport.js";
import { updateFinanceAutoEntryRule } from "./updateFinanceAutoEntryRule.js";

describe("automatic finance entry rule validation", () => {
  it("rejects event/basis and sale-output mismatches at creation", async () => {
    const ports = createPorts();

    await expect(
      createFinanceAutoEntryRule(
        context(),
        {
          calculation: {
            basis: "financing",
            basisPoints: 100,
            kind: "percentage",
          },
          event: "vehicle_sale_closed",
          outputType: "commission",
          timing: { kind: "same_day" },
        },
        ports,
      ),
    ).rejects.toThrow("must use sale or commission basis");
    await expect(
      createFinanceAutoEntryRule(
        context(),
        {
          calculation: { amountCents: 1000, kind: "fixed" },
          event: "vehicle_sale_closed",
          outputType: "revenue",
          timing: { kind: "same_day" },
        },
        ports,
      ),
    ).rejects.toThrow("must output commission");
  });

  it("validates merged updates so an event change cannot retain a wrong basis", async () => {
    const ports = createPorts();
    const rule = await createFinanceAutoEntryRule(
      context(),
      {
        calculation: {
          basis: "financing",
          basisPoints: 100,
          kind: "percentage",
        },
        event: "financing_approved",
        outputType: "revenue",
        timing: { kind: "same_day" },
      },
      ports,
    );

    await expect(
      updateFinanceAutoEntryRule(
        context(),
        {
          event: "insurance_issued",
          ruleId: rule.id,
        },
        ports,
      ),
    ).rejects.toBeInstanceOf(FinanceAutoEntryRuleValidationError);
  });

  it("rejects non-UUID sellers and fixed amounts outside Postgres integer range", async () => {
    const ports = createPorts();
    const base = {
      event: "insurance_issued" as const,
      outputType: "expense" as const,
      timing: { kind: "same_day" as const },
    };

    await expect(
      createFinanceAutoEntryRule(
        context(),
        {
          ...base,
          calculation: { amountCents: 1000, kind: "fixed" },
          sellerUserId: "seller_1",
        },
        ports,
      ),
    ).rejects.toThrow("sellerUserId is invalid");
    await expect(
      createFinanceAutoEntryRule(
        context(),
        {
          ...base,
          calculation: {
            amountCents: financeAutoEntryMaxAmountCents + 1,
            kind: "fixed",
          },
        },
        ports,
      ),
    ).rejects.toThrow("calculation.amountCents is invalid");
  });

  it("does not allow archived rules to be reactivated", async () => {
    const ports = createPorts();
    const rule = await createFinanceAutoEntryRule(
      context(),
      {
        calculation: { amountCents: 1000, kind: "fixed" },
        event: "vehicle_sale_closed",
        outputType: "commission",
        timing: { kind: "same_day" },
      },
      ports,
    );
    await deactivateFinanceAutoEntryRule(context(), { ruleId: rule.id }, ports);

    await expect(
      updateFinanceAutoEntryRule(
        context(),
        {
          ruleId: rule.id,
          status: "active",
        },
        ports,
      ),
    ).rejects.toThrow("Archived finance auto-entry rules cannot be updated");
  });

  it("validates ppm precision, typed conditions, recipients, and override family", async () => {
    const ports = createPorts();
    await expect(
      createFinanceAutoEntryRule(
        context(),
        {
          calculation: {
            basis: "consortium",
            kind: "rate_ppm",
            ratePpm: 1_000_001,
          },
          event: "consortium_sold",
          outputType: "commission",
          timing: { kind: "same_day" },
        },
        ports,
      ),
    ).rejects.toThrow("calculation.ratePpm is invalid");
    await expect(
      createFinanceAutoEntryRule(
        context(),
        {
          calculation: { amountCents: 1_000, kind: "fixed" },
          conditions: { transferHasLien: true },
          event: "insurance_issued",
          outputType: "expense",
          timing: { kind: "same_day" },
        },
        ports,
      ),
    ).rejects.toThrow(
      "transferHasLien conditions require transfer_documentation_charged",
    );
    await expect(
      createFinanceAutoEntryRule(
        context(),
        {
          calculation: { amountCents: 1_000, kind: "fixed" },
          event: "insurance_issued",
          outputType: "expense",
          recipient: { kind: "fixed_user", userId: "not-a-uuid" },
          timing: { kind: "same_day" },
        },
        ports,
      ),
    ).rejects.toThrow("recipient.userId is invalid");

    const precise = await createFinanceAutoEntryRule(
      context(),
      {
        calculation: {
          basis: "consortium",
          kind: "rate_ppm",
          ratePpm: 2_770,
        },
        event: "consortium_sold",
        outputType: "commission",
        resolution: "seller_override",
        ruleKey: "consortium.seller",
        timing: { kind: "same_day" },
      },
      ports,
    );
    expect(precise).toMatchObject({
      family: "consortium.seller",
      recipient: { kind: "event_seller" },
      resolution: "seller_override",
    });
  });
});

function createPorts(
  financeAutoEntryRepository = createTestFinanceAutoEntryRepository(),
): FinanceServicePorts {
  return {
    documentRepository: createTestDocumentRepository(),
    financeAutoEntryRepository,
    financeRepository: createTestFinanceRepository(),
  };
}

function context() {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions: ["finance.auto_entries.manage", "finance.read"],
    request: { requestId: "request_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}
