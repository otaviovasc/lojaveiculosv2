import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { FinanceEntry } from "../../ports/financeRepository.js";
import {
  auditFinanceServiceEvent,
  getFinanceRepository,
  logFinanceServiceEvent,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.read";

export type FinanceSummary = {
  cancelledAmountCents: number;
  commissionAmountCents: number;
  expenseAmountCents: number;
  overdueAmountCents: number;
  paidAmountCents: number;
  pendingAmountCents: number;
  revenueAmountCents: number;
};

export async function getFinanceSummary(
  context: ServiceContext,
  ports?: FinanceServicePorts,
): Promise<FinanceSummary> {
  assertPermission(context, permission);
  const bundles = await getFinanceRepository(ports).list({
    limit: 500,
    storeId: context.storeId,
    tenantId: context.tenantId,
  });
  const entries = bundles.map((bundle) => bundle.entry);
  const summary = summarizeFinanceEntries(entries);

  logFinanceServiceEvent(context, "finance_summary.read", {
    entryCount: entries.length,
  });

  await auditFinanceServiceEvent(context, {
    action: "finance_summary.read",
    category: "data_access",
    entityId: `finance_summary:${context.storeId ?? "unscoped"}`,
    metadata: { entryCount: entries.length },
    permission,
    summary: "Read finance summary",
  });

  return summary;
}

function summarizeFinanceEntries(
  entries: readonly FinanceEntry[],
): FinanceSummary {
  const now = Date.now();
  return {
    cancelledAmountCents: sum(
      entries.filter((entry) => entry.status === "cancelled"),
    ),
    commissionAmountCents: sum(
      entries.filter((entry) => entry.type === "commission"),
    ),
    expenseAmountCents: sum(
      entries.filter((entry) => entry.type === "expense"),
    ),
    overdueAmountCents: sum(
      entries.filter(
        (entry) => entry.status === "pending" && isOverdue(entry.dueAt, now),
      ),
    ),
    paidAmountCents: sum(entries.filter((entry) => entry.status === "paid")),
    pendingAmountCents: sum(
      entries.filter((entry) => entry.status === "pending"),
    ),
    revenueAmountCents: sum(
      entries.filter((entry) => entry.type === "revenue"),
    ),
  };
}

function sum(entries: readonly FinanceEntry[]): number {
  return entries.reduce((total, entry) => total + entry.amountCents, 0);
}

function isOverdue(dueAt: Date | null, now: number): boolean {
  return dueAt ? dueAt.getTime() < now : false;
}
