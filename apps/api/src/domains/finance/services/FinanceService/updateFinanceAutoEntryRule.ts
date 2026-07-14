import type {
  FinanceAutoEntryCalculation,
  FinanceAutoEntryEvent,
  FinanceAutoEntryOutputType,
  FinanceAutoEntryRecipient,
  FinanceAutoEntryRuleConditions,
  FinanceAutoEntryRuleResolution,
  FinanceAutoEntryRuleStatus,
  FinanceAutoEntryTiming,
} from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { FinanceAutoEntryRule } from "../../ports/financeAutoEntryRepository.js";
import {
  FinanceAutoEntryRuleValidationError,
  normalizeFinanceAutoEntryRuleDefinition,
} from "./financeAutoEntryRuleValidation.js";
import { assertRuleUsersBelongToStore } from "../../financeAutoEntryStoreUsers.js";
import {
  auditFinanceServiceEvent,
  FinanceAutoEntryRuleNotFoundError,
  getFinanceAutoEntryRepository,
  logFinanceServiceEvent,
  requireFinanceScope,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.auto_entries.manage";

export type UpdateFinanceAutoEntryRuleInput = {
  calculation?: FinanceAutoEntryCalculation;
  category?: string | null;
  conditions?: FinanceAutoEntryRuleConditions;
  event?: FinanceAutoEntryEvent;
  family?: string | null;
  metadata?: Record<string, unknown>;
  name?: string | null;
  outputType?: FinanceAutoEntryOutputType;
  priority?: number;
  recipient?: FinanceAutoEntryRecipient;
  resolution?: FinanceAutoEntryRuleResolution;
  ruleKey?: string | null;
  ruleId: string;
  sellerUserId?: string | null;
  status?: FinanceAutoEntryRuleStatus;
  timing?: FinanceAutoEntryTiming;
};

export async function updateFinanceAutoEntryRule(
  context: ServiceContext,
  input: UpdateFinanceAutoEntryRuleInput,
  ports?: FinanceServicePorts,
): Promise<FinanceAutoEntryRule> {
  assertPermission(context, permission);
  const scope = requireFinanceScope(context);
  const repository = getFinanceAutoEntryRepository(ports);
  const current = await repository.findRuleById({
    ruleId: input.ruleId,
    ...scope,
  });
  if (!current) throw new FinanceAutoEntryRuleNotFoundError(input.ruleId);
  if (isArchived(current.metadata)) {
    throw new FinanceAutoEntryRuleValidationError(
      "Archived finance auto-entry rules cannot be updated.",
    );
  }

  const next = normalizeFinanceAutoEntryRuleDefinition({
    calculation: input.calculation ?? current.calculation,
    category: input.category !== undefined ? input.category : current.category,
    conditions: input.conditions ?? current.conditions,
    event: input.event ?? current.event,
    family: input.family !== undefined ? input.family : current.family,
    name: input.name !== undefined ? input.name : current.name,
    outputType: input.outputType ?? current.outputType,
    priority: input.priority ?? current.priority,
    recipient: input.recipient ?? current.recipient,
    resolution: input.resolution ?? current.resolution,
    ruleKey: input.ruleKey !== undefined ? input.ruleKey : current.ruleKey,
    sellerUserId:
      input.sellerUserId !== undefined
        ? input.sellerUserId
        : current.sellerUserId,
    status: input.status ?? current.status,
    timing: input.timing ?? current.timing,
  });
  await assertRuleUsersBelongToStore(repository, next, scope);
  const changedFields = Object.keys(input).filter((key) => key !== "ruleId");

  logFinanceServiceEvent(context, "finance_auto_entry_rule.update.started", {
    changedFields,
    ruleId: input.ruleId,
  });
  const rule = await repository.updateRule({
    ...next,
    metadata: input.metadata ?? current.metadata,
    ruleId: current.id,
    ...scope,
  });

  await auditFinanceServiceEvent(context, {
    action: "finance_auto_entry_rule.update",
    category: "data_change",
    entityId: rule.id,
    entityType: "finance_auto_entry_rule",
    metadata: { changedFields },
    permission,
    summary: "Updated automatic finance entry rule",
  });
  return rule;
}

function isArchived(metadata: Record<string, unknown>): boolean {
  return (
    typeof metadata.archivedAt === "string" && Boolean(metadata.archivedAt)
  );
}
