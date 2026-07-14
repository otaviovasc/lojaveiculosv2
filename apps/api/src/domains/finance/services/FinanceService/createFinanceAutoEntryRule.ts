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
  normalizeFinanceAutoEntryRuleDefinition,
  type FinanceAutoEntryRuleDefinition,
} from "./financeAutoEntryRuleValidation.js";
import { assertRuleUsersBelongToStore } from "../../financeAutoEntryStoreUsers.js";
import {
  auditFinanceServiceEvent,
  getFinanceAutoEntryRepository,
  logFinanceServiceEvent,
  requireFinanceScope,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.auto_entries.manage";

export type CreateFinanceAutoEntryRuleInput = {
  calculation: FinanceAutoEntryCalculation;
  category?: string | null;
  conditions?: FinanceAutoEntryRuleConditions;
  event: FinanceAutoEntryEvent;
  family?: string | null;
  metadata?: Record<string, unknown>;
  name?: string | null;
  outputType: FinanceAutoEntryOutputType;
  priority?: number;
  recipient?: FinanceAutoEntryRecipient;
  resolution?: FinanceAutoEntryRuleResolution;
  ruleKey?: string | null;
  sellerUserId?: string | null;
  status?: FinanceAutoEntryRuleStatus;
  timing: FinanceAutoEntryTiming;
};

export async function createFinanceAutoEntryRule(
  context: ServiceContext,
  input: CreateFinanceAutoEntryRuleInput,
  ports?: FinanceServicePorts,
): Promise<FinanceAutoEntryRule> {
  assertPermission(context, permission);
  const scope = requireFinanceScope(context);
  const definition = normalizeFinanceAutoEntryRuleDefinition({
    calculation: input.calculation,
    category: input.category ?? null,
    conditions: input.conditions ?? {},
    event: input.event,
    family: input.family ?? null,
    name: input.name ?? null,
    outputType: input.outputType,
    priority: input.priority ?? 0,
    recipient: input.recipient ?? { kind: "event_seller" },
    resolution: input.resolution ?? "additive",
    ruleKey: input.ruleKey ?? null,
    sellerUserId: input.sellerUserId ?? null,
    status: input.status ?? "active",
    timing: input.timing,
  });
  const repository = getFinanceAutoEntryRepository(ports);
  await assertRuleUsersBelongToStore(repository, definition, scope);

  logFinanceServiceEvent(context, "finance_auto_entry_rule.create.started", {
    event: definition.event,
    outputType: definition.outputType,
    sellerUserId: definition.sellerUserId,
  });

  const rule = await repository.createRule({
    ...definition,
    metadata: input.metadata ?? {},
    ...scope,
  });

  await auditFinanceServiceEvent(context, {
    action: "finance_auto_entry_rule.create",
    category: "data_change",
    entityId: rule.id,
    entityType: "finance_auto_entry_rule",
    metadata: ruleAuditMetadata(rule),
    permission,
    summary: "Created automatic finance entry rule",
  });

  return rule;
}

function ruleAuditMetadata(
  rule: FinanceAutoEntryRuleDefinition,
): Record<string, string | number | null> {
  return {
    event: rule.event,
    family: rule.family,
    outputType: rule.outputType,
    priority: rule.priority,
    resolution: rule.resolution,
    ruleKey: rule.ruleKey,
    sellerUserId: rule.sellerUserId,
    status: rule.status,
  };
}
