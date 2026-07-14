import type { EnsureFinanceAutoEntryRulesInput } from "./ports/financeAutoEntryRepository.js";

const systemMetadata = {
  systemDefault: true,
  v1Parity: true,
  version: 1,
} as const;

export function financingStoreDefaults(): EnsureFinanceAutoEntryRulesInput["rules"] {
  const rates = [
    ["R1", 12_000],
    ["R2", 24_000],
    ["R3", 36_000],
    ["R4", 48_000],
    ["R5", 60_000],
  ] as const;
  return rates.map(([rank, ratePpm]) => ({
    calculation: { basis: "financing", kind: "rate_ppm", ratePpm },
    category: "Financiamento",
    conditions: { financingRank: rank },
    event: "financing_approved",
    family: "financing.store",
    metadata: {
      ...systemMetadata,
      policy: {
        financingRank: rank,
        product: "financing",
        storeRatePpm: ratePpm,
      },
    },
    name: `Receita da loja no financiamento ${rank}`,
    outputType: "revenue",
    priority: 0,
    recipient: { kind: "none" },
    resolution: "additive",
    ruleKey: `financing.store.${rank}`,
    sellerUserId: null,
    status: "active",
    timing: { kind: "same_day" },
  }));
}
