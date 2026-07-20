import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { FinanceRecurringEntry } from "../../ports/financeRepository.js";
import {
  auditFinanceServiceEvent,
  findScopedFinanceRecurringEntry,
  getFinanceRepository,
  logFinanceServiceEvent,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.update";

export type CancelFinanceRecurringEntryInput = {
  reason?: string | null;
  recurringEntryId: string;
};

export async function cancelFinanceRecurringEntry(
  context: ServiceContext,
  input: CancelFinanceRecurringEntryInput,
  ports?: FinanceServicePorts,
): Promise<FinanceRecurringEntry> {
  assertPermission(context, permission);
  const repository = getFinanceRepository(ports);
  const current = await findScopedFinanceRecurringEntry(
    context,
    repository,
    input.recurringEntryId,
  );

  logFinanceServiceEvent(context, "finance_recurring_entry.cancel.started", {
    reason: input.reason ?? null,
    recurringEntryId: input.recurringEntryId,
  });

  const updated = await repository.updateRecurringEntry({
    metadata: {
      ...current.metadata,
      cancelledReason: input.reason ?? null,
    },
    recurringEntryId: input.recurringEntryId,
    status: "cancelled",
    storeId: context.storeId,
    tenantId: context.tenantId,
  });

  await auditFinanceServiceEvent(context, {
    action: "finance_recurring_entry.cancel",
    category: "data_change",
    changes: [{ after: "cancelled", before: current.status, path: "status" }],
    entityId: updated.id,
    entityType: "finance_recurring_entry",
    metadata: { reason: input.reason ?? null },
    permission,
    summary: "Cancelled recurring finance entry",
  });

  return updated;
}
