import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  auditFinanceServiceEvent,
  getCommissionWorkspaceRepository,
  logFinanceServiceEvent,
  requireFinanceScope,
  type FinanceServicePorts,
} from "./serviceSupport.js";

const permission = "finance.update";

export type SettleCommissionEntriesInput = {
  entryIds: readonly string[];
  paidAt?: Date | null;
  sellerUserId: string;
};

export type CommissionSettlementResult = {
  entryIds: readonly string[];
  paidAt: Date;
  sellerUserId: string;
  totalCents: number;
  updatedCount: number;
};

export async function settleCommissionEntries(
  context: ServiceContext,
  input: SettleCommissionEntriesInput,
  ports?: FinanceServicePorts,
): Promise<CommissionSettlementResult> {
  assertPermission(context, permission);
  const entryIds = [
    ...new Set(input.entryIds.map((entryId) => entryId.trim())),
  ];
  const sellerUserId = input.sellerUserId.trim();
  const paidAt = input.paidAt ?? new Date();
  if (
    !sellerUserId ||
    !entryIds.length ||
    entryIds.some((entryId) => !entryId) ||
    entryIds.length !== input.entryIds.length ||
    entryIds.length > 500 ||
    Number.isNaN(paidAt.getTime())
  ) {
    throw new CommissionSettlementValidationError();
  }
  const scope = requireFinanceScope(context);
  logFinanceServiceEvent(context, "commission_settlement.started", {
    count: entryIds.length,
    paidAt: paidAt.toISOString(),
    sellerUserId,
  });
  const settlement = await getCommissionWorkspaceRepository(
    ports,
  ).settleEntries({
    entryIds,
    paidAt,
    sellerUserId,
    ...scope,
  });
  const entries = settlement.entries;
  const totalCents = entries.reduce(
    (total, entry) => total + entry.amountCents,
    0,
  );
  await auditFinanceServiceEvent(context, {
    action: settlement.changed
      ? "commission_settlement.pay"
      : "commission_settlement.replay",
    category: settlement.changed ? "data_change" : "data_access",
    changes: settlement.changed
      ? [
          { after: "paid", before: "pending", path: "status" },
          { after: paidAt.toISOString(), before: null, path: "paidAt" },
        ]
      : [],
    entityId: `commission_settlement:${context.requestId}`,
    metadata: {
      count: entries.length,
      paidAt: paidAt.toISOString(),
      sellerUserId,
      totalCents,
    },
    permission,
    relatedEntities: entries.map((entry) => ({
      id: entry.id,
      type: "finance_entry",
    })),
    summary: settlement.changed
      ? "Settled seller commissions atomically"
      : "Replayed an existing seller commission settlement",
  });
  return {
    entryIds: entries.map((entry) => entry.id),
    paidAt,
    sellerUserId,
    totalCents,
    updatedCount: settlement.changed ? entries.length : 0,
  };
}

export class CommissionSettlementValidationError extends Error {
  constructor() {
    super("Commission settlement input is invalid.");
    this.name = "CommissionSettlementValidationError";
  }
}
