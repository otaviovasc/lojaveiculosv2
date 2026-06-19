import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  FinanceEntryStatus,
  FinanceEntryType,
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

export type ListFinanceEntriesInput = {
  limit?: number;
  status?: FinanceEntryStatus | null;
  targetId?: string | null;
  targetType?: FinanceLinkTarget | null;
  type?: FinanceEntryType | null;
};

export async function listFinanceEntries(
  context: ServiceContext,
  input: ListFinanceEntriesInput,
  ports?: FinanceServicePorts,
): Promise<readonly FinanceEntryBundle[]> {
  assertPermission(context, permission);
  const entries = await getFinanceRepository(ports).list({
    limit: clampLimit(input.limit),
    status: input.status ?? null,
    storeId: context.storeId,
    tenantId: context.tenantId,
    type: input.type ?? null,
  });

  logFinanceServiceEvent(context, "finance_entry.list.read", {
    count: entries.length,
    status: input.status ?? null,
    type: input.type ?? null,
  });

  await auditFinanceServiceEvent(context, {
    action: "finance_entry.list.read",
    category: "data_access",
    entityId: `finance_entries:${context.storeId ?? "unscoped"}`,
    metadata: {
      count: entries.length,
      status: input.status ?? null,
      type: input.type ?? null,
    },
    permission,
    summary: "Listed finance entries",
  });

  return entries;
}

function clampLimit(value: number | undefined): number {
  if (!value) return 100;
  return Math.min(Math.max(value, 1), 200);
}
