import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  FinanceEntryBundle,
  FinanceLinkTarget,
} from "../../ports/financeRepository.js";
import {
  auditFinanceServiceEvent,
  getFinanceRepository,
  logFinanceServiceEvent,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.read";

export type ListFinanceEntriesByTargetInput = {
  limit?: number;
  targetId: string;
  targetType: FinanceLinkTarget;
};

export async function listFinanceEntriesByTarget(
  context: ServiceContext,
  input: ListFinanceEntriesByTargetInput,
  ports?: FinanceServicePorts,
): Promise<readonly FinanceEntryBundle[]> {
  assertPermission(context, permission);
  const bundles = await getFinanceRepository(ports).list({
    limit: input.limit ?? 100,
    storeId: context.storeId,
    targetId: input.targetId,
    targetType: input.targetType,
    tenantId: context.tenantId,
  });

  logFinanceServiceEvent(context, "finance_entry.target.list.read", {
    count: bundles.length,
    targetId: input.targetId,
    targetType: input.targetType,
  });

  await auditFinanceServiceEvent(context, {
    action: "finance_entry.target.list.read",
    category: "data_access",
    entityId: input.targetId,
    entityType: "finance_entry",
    metadata: { count: bundles.length, targetType: input.targetType },
    permission,
    summary: "Listed finance entries by target",
  });

  return bundles;
}
