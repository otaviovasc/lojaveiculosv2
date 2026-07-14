import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { FinanceAutoEntryRule } from "../../ports/financeAutoEntryRepository.js";
import {
  auditFinanceServiceEvent,
  FinanceAutoEntryRuleNotFoundError,
  getFinanceAutoEntryRepository,
  logFinanceServiceEvent,
  requireFinanceScope,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.auto_entries.manage";

export async function deactivateFinanceAutoEntryRule(
  context: ServiceContext,
  input: { ruleId: string },
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

  logFinanceServiceEvent(
    context,
    "finance_auto_entry_rule.deactivate.started",
    {
      ruleId: current.id,
    },
  );
  const archivedAt = new Date().toISOString();
  const alreadyArchived = isArchived(current.metadata);
  const rule = alreadyArchived
    ? current
    : await repository.updateRule({
        metadata: {
          ...current.metadata,
          archivedAt,
          archivedByActorId: context.actor.id,
        },
        ruleId: current.id,
        status: "inactive",
        ...scope,
      });

  await auditFinanceServiceEvent(context, {
    action: "finance_auto_entry_rule.deactivate",
    category: "data_change",
    changes: alreadyArchived
      ? []
      : [
          { after: rule.status, before: current.status, path: "status" },
          { after: archivedAt, path: "metadata.archivedAt" },
        ],
    entityId: rule.id,
    entityType: "finance_auto_entry_rule",
    metadata: { alreadyArchived },
    permission,
    summary: "Deactivated automatic finance entry rule",
  });
  return rule;
}

function isArchived(metadata: Record<string, unknown>): boolean {
  return (
    typeof metadata.archivedAt === "string" && Boolean(metadata.archivedAt)
  );
}
