import { ruleMoneyInput, validMoney } from "./domainModel";
import type { AutoEntryRule } from "./types";

export type DocumentationTierDraft = {
  amount: string;
  current?: AutoEntryRule;
  max: string;
  min: string;
};

export const documentationTierSuggestions: readonly DocumentationTierDraft[] = [
  { amount: "", max: "", min: "" },
  { amount: "", max: "", min: "" },
];

export function documentationTierDrafts(
  rules: readonly AutoEntryRule[],
): DocumentationTierDraft[] {
  return rules.map((current) => ({
    amount: ruleMoneyInput(current),
    current,
    max: moneyInput(current.conditions?.basisRange?.maxCents),
    min: moneyInput(current.conditions?.basisRange?.minCents),
  }));
}

export function parseDocumentationTiers(
  drafts: readonly DocumentationTierDraft[],
) {
  const entered = drafts.filter(hasAnyValue);
  const parsed = entered.map(parseTier).filter((tier) => tier !== null);
  if (parsed.length === 0 || parsed.length !== entered.length) {
    return {
      kind: "error" as const,
      message:
        "Preencha faixas completas com valores válidos; sugestões vazias não são salvas.",
    };
  }
  const tiers = [...parsed].sort(
    (left, right) => left.minCents - right.minCents,
  );
  const overlaps = tiers.some(
    (tier, index) =>
      index > 0 && tier.minCents <= (tiers[index - 1]!.maxCents ?? Infinity),
  );
  return overlaps
    ? { kind: "error" as const, message: "As faixas não podem se sobrepor." }
    : { kind: "ready" as const, tiers };
}

function moneyInput(cents: number | null | undefined) {
  return cents === null || cents === undefined
    ? ""
    : String(cents / 100).replace(".", ",");
}

function hasAnyValue(tier: DocumentationTierDraft) {
  return Boolean(tier.amount || tier.max || tier.min);
}

function parseTier(tier: DocumentationTierDraft) {
  const amountCents = validMoney(tier.amount);
  const minCents = validMoney(tier.min);
  const maxCents = tier.max.trim() ? validMoney(tier.max) : null;
  if (
    amountCents === null ||
    minCents === null ||
    (tier.max.trim() && maxCents === null) ||
    (maxCents !== null && maxCents < minCents)
  ) {
    return null;
  }
  return { amountCents, current: tier.current, maxCents, minCents };
}
