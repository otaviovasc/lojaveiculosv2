import type { FinanceAutoEntryRule } from "../../../domains/finance/ports/financeAutoEntryRepository.js";
import {
  financeAutoEntryRuleCategory,
  financeAutoEntryRuleName,
} from "../../../domains/finance/services/FinanceService/financeAutoEntryLabels.js";

export type FinanceAutoEntryRuleDto = Omit<
  FinanceAutoEntryRule,
  "category" | "name"
> & {
  category: string;
  name: string;
};

export function presentFinanceAutoEntryRule(
  rule: FinanceAutoEntryRule,
): FinanceAutoEntryRuleDto {
  return {
    ...rule,
    category: financeAutoEntryRuleCategory(rule),
    name: financeAutoEntryRuleName(rule),
  };
}
