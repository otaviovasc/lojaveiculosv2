import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  FinanceEntryType,
  FinanceRecurringEntry,
} from "../../ports/financeRepository.js";
import {
  auditFinanceServiceEvent,
  getFinanceRepository,
  logFinanceServiceEvent,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.read";

export type ListFinanceRecurringEntriesInput = {
  limit?: number;
  type?: FinanceEntryType | null;
};

export async function listFinanceRecurringEntries(
  context: ServiceContext,
  input: ListFinanceRecurringEntriesInput,
  ports?: FinanceServicePorts,
): Promise<readonly FinanceRecurringEntry[]> {
  assertPermission(context, permission);
  const items = await getFinanceRepository(ports).listRecurringEntries({
    limit: input.limit ?? 100,
    storeId: context.storeId,
    tenantId: context.tenantId,
    type: input.type ?? null,
  });

  logFinanceServiceEvent(context, "finance_recurring_entry.list.read", {
    count: items.length,
    type: input.type ?? null,
  });

  await auditFinanceServiceEvent(context, {
    action: "finance_recurring_entry.list.read",
    category: "data_access",
    entityId: `finance_recurring_entries:${context.storeId ?? "unscoped"}`,
    metadata: { count: items.length, type: input.type ?? null },
    permission,
    summary: "Listed recurring finance entries",
  });

  return items;
}
