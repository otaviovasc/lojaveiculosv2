import type {
  FinanceAutoEntryEvent,
  FinanceAutoEntryRuleStatus,
} from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { FinanceAutoEntryRule } from "../../ports/financeAutoEntryRepository.js";
import { ensureV1FinanceAutoEntryDefaultRules } from "../../financeAutoEntryDefaults.js";
import { FinanceAutoEntryRuleValidationError } from "./financeAutoEntryRuleValidation.js";
import {
  auditFinanceServiceEvent,
  getFinanceAutoEntryRepository,
  logFinanceServiceEvent,
  requireFinanceScope,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.read";

export type ListFinanceAutoEntryRulesInput = {
  event?: FinanceAutoEntryEvent | null;
  limit?: number;
  sellerUserId?: string | null;
  status?: FinanceAutoEntryRuleStatus | null;
};

export async function listFinanceAutoEntryRules(
  context: ServiceContext,
  input: ListFinanceAutoEntryRulesInput,
  ports?: FinanceServicePorts,
): Promise<readonly FinanceAutoEntryRule[]> {
  assertPermission(context, permission);
  const scope = requireFinanceScope(context);
  const limit = input.limit ?? 200;
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new FinanceAutoEntryRuleValidationError("limit is invalid.");
  }

  const repository = getFinanceAutoEntryRepository(ports);
  await ensureV1FinanceAutoEntryDefaultRules(repository, scope);
  const rules = await repository.listRules({
    limit,
    ...scope,
    ...(input.event ? { event: input.event } : {}),
    ...(input.sellerUserId !== undefined
      ? { sellerUserId: input.sellerUserId }
      : {}),
    ...(input.status ? { status: input.status } : {}),
  });

  logFinanceServiceEvent(context, "finance_auto_entry_rule.list.read", {
    count: rules.length,
    event: input.event ?? null,
    status: input.status ?? null,
  });
  await auditFinanceServiceEvent(context, {
    action: "finance_auto_entry_rule.list.read",
    category: "data_access",
    entityId: `finance_auto_entry_rules:${scope.storeId}`,
    entityType: "finance_auto_entry_rule",
    metadata: { count: rules.length },
    permission,
    summary: "Listed automatic finance entry rules",
  });
  return rules;
}
