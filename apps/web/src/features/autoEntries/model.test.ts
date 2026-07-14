import { describe, expect, it } from "vitest";
import {
  buildAutoEntryRuleInput,
  createAutoEntryDraft,
  validateAutoEntryDraft,
} from "./model";
import type { AutoEntryRule } from "./types";

describe("auto-entry rule model", () => {
  it("defaults sale rules to ancillary commission without duplicating revenue", () => {
    const draft = createAutoEntryDraft("vehicle_sale_closed");

    expect(draft).toMatchObject({
      category: "Comissão de venda",
      outputType: "commission",
    });
    expect(
      validateAutoEntryDraft({ ...draft, outputType: "revenue" }),
    ).toMatchObject({
      outputType: "Regras de venda geram apenas comissões auxiliares.",
    });
  });

  it("converts Brazilian fixed values and delayed timing to the API contract", () => {
    const draft = {
      ...createAutoEntryDraft("financing_approved"),
      amountReais: "1.850,50",
      category: "Taxa de financiamento",
      name: "Receita de correspondente",
      outputType: "revenue" as const,
      priority: "80",
      timingKind: "days_after" as const,
      timingValue: "5",
    };

    expect(buildAutoEntryRuleInput(draft)).toEqual(
      expect.objectContaining({
        calculation: { amountCents: 185050, kind: "fixed" },
        priority: 80,
        timing: { days: 5, kind: "days_after" },
      }),
    );
  });

  it("treats a Brazilian thousands separator as reais", () => {
    const draft = {
      ...createAutoEntryDraft("financing_approved"),
      amountReais: "1.850",
      category: "Taxa de financiamento",
      name: "Receita de correspondente",
    };

    expect(buildAutoEntryRuleInput(draft)).toMatchObject({
      calculation: { amountCents: 185_000, kind: "fixed" },
    });
  });

  it("accepts the backend currency maximum without rounding", () => {
    const draft = {
      ...createAutoEntryDraft("insurance_issued"),
      amountReais: "21.474.836,47",
      category: "Seguro",
      name: "Receita máxima",
    };

    expect(buildAutoEntryRuleInput(draft)).toMatchObject({
      calculation: { amountCents: 2_147_483_647, kind: "fixed" },
    });
  });

  it.each(["0,005", "21.474.836,48"])(
    "rejects invalid currency precision or range: %s",
    (amountReais) => {
      const draft = {
        ...createAutoEntryDraft("insurance_issued"),
        amountReais,
        category: "Seguro",
        name: "Receita inválida",
      };

      expect(validateAutoEntryDraft(draft)).toHaveProperty("amountReais");
      expect(buildAutoEntryRuleInput(draft)).toBeNull();
    },
  );

  it("converts percentages to basis points and preserves metadata on edit", () => {
    const rule = autoEntryRule();
    const draft = createAutoEntryDraft(rule.event, rule);

    expect(draft.percentage).toBe("1,5");
    expect(buildAutoEntryRuleInput(draft)).toMatchObject({
      calculation: {
        basis: "financing",
        basisPoints: 150,
        kind: "percentage",
      },
      metadata: { source: "partner_policy" },
      sellerUserId: "seller_1",
    });
  });

  it("preserves rate-ppm precision when editing an existing rule", () => {
    const rule: AutoEntryRule = {
      ...autoEntryRule(),
      calculation: { basis: "premium", kind: "rate_ppm", ratePpm: 149 },
      event: "insurance_issued",
    };
    const draft = {
      ...createAutoEntryDraft(rule.event, rule),
      name: "Regra renomeada",
    };

    expect(draft).toMatchObject({
      calculationBasis: "premium",
      percentage: "0,0149",
      percentageKind: "rate_ppm",
    });
    expect(buildAutoEntryRuleInput(draft)).toMatchObject({
      calculation: { basis: "premium", kind: "rate_ppm", ratePpm: 149 },
      name: "Regra renomeada",
    });
  });

  it("preserves a non-default percentage basis when editing", () => {
    const rule: AutoEntryRule = {
      ...autoEntryRule(),
      calculation: {
        basis: "insurance_commission",
        basisPoints: 150,
        kind: "percentage",
      },
      event: "insurance_issued",
    };
    const draft = createAutoEntryDraft(rule.event, rule);

    expect(draft.calculationBasis).toBe("insurance_commission");
    expect(buildAutoEntryRuleInput(draft)).toMatchObject({
      calculation: {
        basis: "insurance_commission",
        basisPoints: 150,
        kind: "percentage",
      },
    });
  });

  it.each([
    ["vehicle_sale_closed", "sale"],
    ["financing_approved", "financing"],
    ["insurance_issued", "premium"],
  ] as const)("locks the %s percentage basis to %s", (event, expectedBasis) => {
    const draft = {
      ...createAutoEntryDraft(event),
      calculationKind: "percentage" as const,
      category: "Comissão automática",
      name: "Regra percentual",
      percentage: "8,25",
    };

    expect(buildAutoEntryRuleInput(draft)).toMatchObject({
      calculation: {
        basis: expectedBasis,
        basisPoints: 825,
        kind: "percentage",
      },
    });
  });

  it("rejects out-of-range priority, percentage, and monthly timing", () => {
    const draft = {
      ...createAutoEntryDraft("insurance_issued"),
      calculationKind: "percentage" as const,
      category: "Seguro",
      name: "Comissão de seguro",
      percentage: "120",
      priority: "101",
      timingKind: "next_month_day" as const,
      timingValue: "32",
    };

    expect(validateAutoEntryDraft(draft)).toMatchObject({
      percentage: "Use um percentual entre 0,01% e 100%.",
      priority: "Use uma prioridade inteira entre 0 e 100.",
      timingValue: "Use um número inteiro entre 1 e 31.",
    });
    expect(buildAutoEntryRuleInput(draft)).toBeNull();
  });
});

function autoEntryRule(): AutoEntryRule {
  return {
    calculation: {
      basis: "financing",
      basisPoints: 150,
      kind: "percentage",
    },
    category: "Comissão financiamento",
    createdAt: "2026-07-13T12:00:00.000Z",
    event: "financing_approved",
    id: "rule_1",
    metadata: { source: "partner_policy" },
    name: "Comissão financeira",
    outputType: "commission",
    priority: 70,
    sellerUserId: "seller_1",
    status: "active",
    timing: { day: 10, kind: "next_month_day" },
    updatedAt: "2026-07-13T12:00:00.000Z",
  };
}
