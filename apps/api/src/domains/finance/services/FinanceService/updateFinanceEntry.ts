import type {
  AuditFieldChange,
  SafeAuditMetadataValue,
} from "@lojaveiculosv2/audit";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  FinanceEntryStatus,
  FinanceEntryBundle,
} from "../../ports/financeRepository.js";
import {
  auditFinanceServiceEvent,
  findScopedFinanceEntry,
  getFinanceRepository,
  logFinanceServiceEvent,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.update";

export type UpdateFinanceEntryInput = {
  amountCents?: number;
  category?: string;
  dueAt?: Date | null;
  entryId: string;
  metadata?: Record<string, unknown>;
  name?: string;
  paidAt?: Date | null;
  sellerUserId?: string | null;
  status?: FinanceEntryStatus;
};

export async function updateFinanceEntry(
  context: ServiceContext,
  input: UpdateFinanceEntryInput,
  ports?: FinanceServicePorts,
): Promise<FinanceEntryBundle> {
  assertPermission(context, permission);
  const repository = getFinanceRepository(ports);
  const current = await findScopedFinanceEntry(
    context,
    repository,
    input.entryId,
  );
  const changes = createFinanceEntryChanges(current.entry, input);

  logFinanceServiceEvent(context, "finance_entry.update.started", {
    changedFields: changes.map((change) => change.path),
    entryId: input.entryId,
  });

  const updated = changes.length
    ? await repository.updateEntry({
        ...input,
        storeId: context.storeId,
        tenantId: context.tenantId,
      })
    : current;

  await auditFinanceServiceEvent(context, {
    action: "finance_entry.update",
    category: "data_change",
    changes,
    entityId: updated.entry.id,
    metadata: { changedFields: changes.map((change) => change.path) },
    permission,
    summary: "Updated finance entry",
  });

  return updated;
}

function createFinanceEntryChanges(
  entry: FinanceEntryBundle["entry"],
  input: UpdateFinanceEntryInput,
): AuditFieldChange[] {
  return [
    changeFor("amountCents", entry.amountCents, input.amountCents),
    changeFor("category", entry.category, input.category),
    changeFor(
      "dueAt",
      entry.dueAt?.toISOString() ?? null,
      dateValue(input.dueAt),
    ),
    changeFor(
      "metadata",
      JSON.stringify(entry.metadata),
      input.metadata === undefined ? undefined : JSON.stringify(input.metadata),
    ),
    changeFor("name", entry.name, input.name),
    changeFor(
      "paidAt",
      entry.paidAt?.toISOString() ?? null,
      dateValue(input.paidAt),
    ),
    changeFor("sellerUserId", entry.sellerUserId, input.sellerUserId),
    changeFor("status", entry.status, input.status),
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
