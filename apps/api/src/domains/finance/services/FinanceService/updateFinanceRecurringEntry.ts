import type {
  AuditFieldChange,
  SafeAuditMetadataValue,
} from "@lojaveiculosv2/audit";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  FinanceEntryStatus,
  FinanceRecurrenceFrequency,
  FinanceRecurringEntry,
} from "../../ports/financeRepository.js";
import {
  auditFinanceServiceEvent,
  findScopedFinanceRecurringEntry,
  getFinanceRepository,
  logFinanceServiceEvent,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.update";

export type UpdateFinanceRecurringEntryInput = {
  amountCents?: number;
  category?: string;
  dayOfMonth?: number | null;
  frequency?: FinanceRecurrenceFrequency;
  lastGeneratedAt?: Date | null;
  metadata?: Record<string, unknown>;
  name?: string;
  nextDueAt?: Date;
  recurringEntryId: string;
  sellerUserId?: string | null;
  status?: FinanceEntryStatus;
};

export async function updateFinanceRecurringEntry(
  context: ServiceContext,
  input: UpdateFinanceRecurringEntryInput,
  ports?: FinanceServicePorts,
): Promise<FinanceRecurringEntry> {
  assertPermission(context, permission);
  const repository = getFinanceRepository(ports);
  const current = await findScopedFinanceRecurringEntry(
    context,
    repository,
    input.recurringEntryId,
  );
  const changes = createFinanceRecurringEntryChanges(current, input);

  logFinanceServiceEvent(context, "finance_recurring_entry.update.started", {
    changedFields: changes.map((change) => change.path),
    recurringEntryId: input.recurringEntryId,
  });

  const updated = changes.length
    ? await repository.updateRecurringEntry({
        ...input,
        storeId: context.storeId,
        tenantId: context.tenantId,
      })
    : current;

  await auditFinanceServiceEvent(context, {
    action: "finance_recurring_entry.update",
    category: "data_change",
    changes,
    entityId: updated.id,
    entityType: "finance_recurring_entry",
    metadata: { changedFields: changes.map((change) => change.path) },
    permission,
    summary: "Updated recurring finance entry",
  });

  return updated;
}

function createFinanceRecurringEntryChanges(
  current: FinanceRecurringEntry,
  input: UpdateFinanceRecurringEntryInput,
): AuditFieldChange[] {
  return [
    changeFor("amountCents", current.amountCents, input.amountCents),
    changeFor("category", current.category, input.category),
    changeFor("dayOfMonth", current.dayOfMonth, input.dayOfMonth),
    changeFor("frequency", current.frequency, input.frequency),
    changeFor(
      "lastGeneratedAt",
      current.lastGeneratedAt?.toISOString() ?? null,
      dateValue(input.lastGeneratedAt),
    ),
    changeFor(
      "metadata",
      JSON.stringify(current.metadata),
      input.metadata === undefined ? undefined : JSON.stringify(input.metadata),
    ),
    changeFor("name", current.name, input.name),
    changeFor(
      "nextDueAt",
      current.nextDueAt.toISOString(),
      dateValue(input.nextDueAt),
    ),
    changeFor("sellerUserId", current.sellerUserId, input.sellerUserId),
    changeFor("status", current.status, input.status),
  ].filter((change): change is AuditFieldChange => Boolean(change));
}

function dateValue(value: Date | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value ? value.toISOString() : null;
}

function changeFor(
  path: string,
  before: SafeAuditMetadataValue | undefined,
  after: SafeAuditMetadataValue | undefined,
): AuditFieldChange | null {
  if (after === undefined || JSON.stringify(before) === JSON.stringify(after)) {
    return null;
  }
  return {
    after,
    ...(before !== undefined ? { before } : {}),
    path,
  };
}
