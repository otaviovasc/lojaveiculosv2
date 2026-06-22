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
  offset?: number;
  status?: FinanceEntryStatus | null;
  targetId?: string | null;
  targetType?: FinanceLinkTarget | null;
  type?: FinanceEntryType | null;
};

export type FinanceEntryListResult = {
  entries: readonly FinanceEntryBundle[];
  hasMore: boolean;
  nextOffset: number | null;
  total: number;
};

export async function listFinanceEntries(
  context: ServiceContext,
  input: ListFinanceEntriesInput,
  ports?: FinanceServicePorts,
): Promise<FinanceEntryListResult> {
  assertPermission(context, permission);
  const limit = clampLimit(input.limit);
  const offset = clampOffset(input.offset);
  const entries = await getFinanceRepository(ports).list({
    limit: limit + 1,
    offset,
    status: input.status ?? null,
    storeId: context.storeId,
    targetId: input.targetId ?? null,
    targetType: input.targetType ?? null,
    tenantId: context.tenantId,
    type: input.type ?? null,
  });
  const pageEntries = entries.slice(0, limit);

  logFinanceServiceEvent(context, "finance_entry.list.read", {
    count: pageEntries.length,
    offset,
    status: input.status ?? null,
    type: input.type ?? null,
  });

  await auditFinanceServiceEvent(context, {
    action: "finance_entry.list.read",
    category: "data_access",
    entityId: `finance_entries:${context.storeId ?? "unscoped"}`,
    metadata: {
      count: pageEntries.length,
      offset,
      status: input.status ?? null,
      type: input.type ?? null,
    },
    permission,
    summary: "Listed finance entries",
  });

  return {
    entries: pageEntries,
    hasMore: entries.length > limit,
    nextOffset: entries.length > limit ? offset + pageEntries.length : null,
    total: offset + pageEntries.length,
  };
}

function clampLimit(value: number | undefined): number {
  if (!value) return 100;
  return Math.min(Math.max(value, 1), 200);
}

function clampOffset(value: number | undefined): number {
  if (!value) return 0;
  return Math.max(value, 0);
}
