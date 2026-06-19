import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { FinanceEntryBundle } from "../../ports/financeRepository.js";
import {
  auditFinanceServiceEvent,
  findScopedFinanceEntry,
  getFinanceRepository,
  logFinanceServiceEvent,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.update";

export type CancelFinanceEntryInput = {
  entryId: string;
  reason?: string | null;
};

export async function cancelFinanceEntry(
  context: ServiceContext,
  input: CancelFinanceEntryInput,
  ports?: FinanceServicePorts,
): Promise<FinanceEntryBundle> {
  assertPermission(context, permission);
  const repository = getFinanceRepository(ports);
  const current = await findScopedFinanceEntry(
    context,
    repository,
    input.entryId,
  );

  logFinanceServiceEvent(context, "finance_entry.cancel.started", {
    entryId: input.entryId,
    reason: input.reason ?? null,
  });

  const updated = await repository.updateEntry({
    entryId: input.entryId,
    metadata: {
      ...current.entry.metadata,
      cancelledReason: input.reason ?? null,
    },
    status: "cancelled",
    storeId: context.storeId,
    tenantId: context.tenantId,
  });

  await auditFinanceServiceEvent(context, {
    action: "finance_entry.cancel",
    category: "data_change",
    changes: [
      { after: "cancelled", before: current.entry.status, path: "status" },
    ],
    entityId: updated.entry.id,
    metadata: { reason: input.reason ?? null },
    permission,
    summary: "Cancelled finance entry",
  });

  return updated;
}
