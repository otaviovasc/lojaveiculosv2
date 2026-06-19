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

export type PayFinanceEntryInput = {
  entryId: string;
  paidAt?: Date | null;
};

export async function payFinanceEntry(
  context: ServiceContext,
  input: PayFinanceEntryInput,
  ports?: FinanceServicePorts,
): Promise<FinanceEntryBundle> {
  assertPermission(context, permission);
  const repository = getFinanceRepository(ports);
  const current = await findScopedFinanceEntry(
    context,
    repository,
    input.entryId,
  );
  const paidAt = input.paidAt ?? new Date();

  logFinanceServiceEvent(context, "finance_entry.pay.started", {
    entryId: input.entryId,
    paidAt: paidAt.toISOString(),
  });

  const updated = await repository.updateEntry({
    entryId: input.entryId,
    paidAt,
    status: "paid",
    storeId: context.storeId,
    tenantId: context.tenantId,
  });

  await auditFinanceServiceEvent(context, {
    action: "finance_entry.pay",
    category: "data_change",
    changes: [
      { after: "paid", before: current.entry.status, path: "status" },
      {
        after: paidAt.toISOString(),
        before: current.entry.paidAt?.toISOString() ?? null,
        path: "paidAt",
      },
    ],
    entityId: updated.entry.id,
    permission,
    summary: "Marked finance entry as paid",
  });

  return updated;
}
