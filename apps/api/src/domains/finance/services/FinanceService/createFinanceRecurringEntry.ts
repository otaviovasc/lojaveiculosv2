import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  FinanceEntryStatus,
  FinanceEntryType,
  FinanceRecurrenceFrequency,
  FinanceRecurringEntry,
} from "../../ports/financeRepository.js";
import {
  auditFinanceServiceEvent,
  getFinanceRepository,
  logFinanceServiceEvent,
  requireFinanceScope,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.create";

export type CreateFinanceRecurringEntryInput = {
  amountCents: number;
  category: string;
  dayOfMonth?: number | null;
  frequency: FinanceRecurrenceFrequency;
  metadata?: Record<string, unknown>;
  name: string;
  nextDueAt: Date;
  sellerUserId?: string | null;
  status?: FinanceEntryStatus;
  type: FinanceEntryType;
};

export async function createFinanceRecurringEntry(
  context: ServiceContext,
  input: CreateFinanceRecurringEntryInput,
  ports?: FinanceServicePorts,
): Promise<FinanceRecurringEntry> {
  assertPermission(context, permission);
  const scope = requireFinanceScope(context);

  logFinanceServiceEvent(context, "finance_recurring_entry.create.started", {
    amountCents: input.amountCents,
    frequency: input.frequency,
    type: input.type,
  });

  const recurring = await getFinanceRepository(ports).createRecurringEntry({
    amountCents: input.amountCents,
    category: input.category,
    dayOfMonth: input.dayOfMonth ?? null,
    frequency: input.frequency,
    metadata: input.metadata ?? {},
    name: input.name,
    nextDueAt: input.nextDueAt,
    sellerUserId: input.sellerUserId ?? null,
    status: input.status ?? "pending",
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    type: input.type,
  });

  await auditFinanceServiceEvent(context, {
    action: "finance_recurring_entry.create",
    category: "data_change",
    entityId: recurring.id,
    metadata: {
      amountCents: recurring.amountCents,
      frequency: recurring.frequency,
      type: recurring.type,
    },
    permission,
    summary: "Created recurring finance entry",
  });

  return recurring;
}
