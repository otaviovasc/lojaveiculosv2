import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CommissionRule,
  CommissionRuleStatus,
  CommissionRuleType,
} from "../../ports/financeRepository.js";
import {
  auditFinanceServiceEvent,
  getFinanceRepository,
  logFinanceServiceEvent,
  requireFinanceScope,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.create";

export type CreateCommissionRuleInput = {
  category: string;
  fixedAmountCents?: number | null;
  metadata?: Record<string, unknown>;
  name: string;
  percentageBasisPoints?: number | null;
  sellerUserId?: string | null;
  status?: CommissionRuleStatus;
  type: CommissionRuleType;
};

export async function createCommissionRule(
  context: ServiceContext,
  input: CreateCommissionRuleInput,
  ports?: FinanceServicePorts,
): Promise<CommissionRule> {
  assertPermission(context, permission);
  const scope = requireFinanceScope(context);

  logFinanceServiceEvent(context, "commission_rule.create.started", {
    category: input.category,
    type: input.type,
  });

  const rule = await getFinanceRepository(ports).createCommissionRule({
    category: input.category,
    fixedAmountCents: input.fixedAmountCents ?? null,
    metadata: input.metadata ?? {},
    name: input.name,
    percentageBasisPoints: input.percentageBasisPoints ?? null,
    sellerUserId: input.sellerUserId ?? null,
    status: input.status ?? "active",
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    type: input.type,
  });

  await auditFinanceServiceEvent(context, {
    action: "commission_rule.create",
    category: "data_change",
    entityId: rule.id,
    entityType: "finance_entry",
    metadata: { category: rule.category, type: rule.type },
    permission,
    summary: "Created commission rule",
  });

  return rule;
}
