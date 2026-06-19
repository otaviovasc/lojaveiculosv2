import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CommissionRule,
  CommissionRuleStatus,
} from "../../ports/financeRepository.js";
import {
  auditFinanceServiceEvent,
  getFinanceRepository,
  logFinanceServiceEvent,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.read";

export type ListCommissionRulesInput = {
  limit?: number;
  sellerUserId?: string | null;
  status?: CommissionRuleStatus | null;
};

export async function listCommissionRules(
  context: ServiceContext,
  input: ListCommissionRulesInput,
  ports?: FinanceServicePorts,
): Promise<readonly CommissionRule[]> {
  assertPermission(context, permission);
  const rules = await getFinanceRepository(ports).listCommissionRules({
    limit: input.limit ?? 100,
    sellerUserId: input.sellerUserId ?? null,
    status: input.status ?? null,
    storeId: context.storeId,
    tenantId: context.tenantId,
  });

  logFinanceServiceEvent(context, "commission_rule.list.read", {
    count: rules.length,
    status: input.status ?? null,
  });

  await auditFinanceServiceEvent(context, {
    action: "commission_rule.list.read",
    category: "data_access",
    entityId: `commission_rules:${context.storeId ?? "unscoped"}`,
    metadata: { count: rules.length, status: input.status ?? null },
    permission,
    summary: "Listed commission rules",
  });

  return rules;
}
