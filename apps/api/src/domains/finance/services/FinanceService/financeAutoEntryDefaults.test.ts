import { describe, expect, it } from "vitest";
import { createTestDocumentRepository } from "../../../documents/testSupportDocumentRepository.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createTestFinanceAutoEntryRepository } from "../../testSupportFinanceAutoEntryRepository.js";
import { createTestFinanceRepository } from "../../testSupportFinanceRepository.js";
import {
  buildV1FinanceAutoEntryDefaultRules,
  ensureV1FinanceAutoEntryDefaultRules,
  financeAutoEntryV1DefaultRuleKeys,
} from "../../financeAutoEntryDefaults.js";
import { listFinanceAutoEntryRules } from "./listFinanceAutoEntryRules.js";

describe("V1 finance auto-entry defaults", () => {
  it("defines only the active V1 defaults with exact rates and precision", () => {
    const rules = buildV1FinanceAutoEntryDefaultRules();

    expect(rules).toHaveLength(13);
    expect(
      rules
        .filter((rule) => rule.event === "financing_approved")
        .map((rule) => [rule.conditions.financingRank, rule.calculation]),
    ).toEqual([
      ["R1", { basis: "financing", kind: "rate_ppm", ratePpm: 12_000 }],
      ["R2", { basis: "financing", kind: "rate_ppm", ratePpm: 24_000 }],
      ["R3", { basis: "financing", kind: "rate_ppm", ratePpm: 36_000 }],
      ["R4", { basis: "financing", kind: "rate_ppm", ratePpm: 48_000 }],
      ["R5", { basis: "financing", kind: "rate_ppm", ratePpm: 60_000 }],
    ]);
    expect(
      rules.find(
        (rule) =>
          rule.ruleKey === financeAutoEntryV1DefaultRuleKeys.consortiumSeller,
      )?.calculation,
    ).toEqual({ basis: "consortium", kind: "rate_ppm", ratePpm: 2_770 });
    expect(
      rules.find(
        (rule) =>
          rule.ruleKey ===
          financeAutoEntryV1DefaultRuleKeys.saleStandardCommission,
      ),
    ).toMatchObject({
      calculation: {
        basis: "commission",
        basisPoints: 10_000,
        kind: "percentage",
      },
      conditions: {
        basisRange: { basis: "commission", minCents: 1 },
        standardCommissionEnabled: true,
      },
      resolution: "seller_override",
    });
    expect(
      rules.some(
        (rule) =>
          rule.ruleKey.includes("financing.seller") ||
          rule.ruleKey.includes("transfer.seller"),
      ),
    ).toBe(false);
  });

  it("provisions idempotently without overwriting an existing default", async () => {
    const repository = createTestFinanceAutoEntryRepository();
    const scope = { storeId: "store_1", tenantId: "tenant_1" };

    const first = await ensureV1FinanceAutoEntryDefaultRules(repository, scope);
    const standardCommission = first.find(
      (rule) =>
        rule.ruleKey ===
        financeAutoEntryV1DefaultRuleKeys.saleStandardCommission,
    );
    expect(standardCommission).toBeDefined();
    await repository.updateRule({
      ruleId: standardCommission!.id,
      status: "inactive",
      ...scope,
    });

    const second = await ensureV1FinanceAutoEntryDefaultRules(
      repository,
      scope,
    );
    expect(repository.rules).toHaveLength(13);
    expect(second).toHaveLength(13);
    expect(
      second.find((rule) => rule.id === standardCommission!.id)?.status,
    ).toBe("inactive");
  });

  it("provisions defaults when rules are listed before the first sale", async () => {
    const repository = createTestFinanceAutoEntryRepository();
    const rules = await listFinanceAutoEntryRules(
      createServiceContext({
        actor: { id: "user_1", kind: "user" },
        permissions: ["finance.read"],
        request: { requestId: "request_1" },
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
      {},
      {
        documentRepository: createTestDocumentRepository(),
        financeAutoEntryRepository: repository,
        financeRepository: createTestFinanceRepository(),
      },
    );

    expect(rules).toHaveLength(13);
    expect(repository.rules).toHaveLength(13);
  });
});
