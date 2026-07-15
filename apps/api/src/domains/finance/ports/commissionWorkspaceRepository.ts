import type { FinanceEntry, FinanceEntryBundle } from "./financeRepository.js";

export type CommissionWorkspaceSaleStatus =
  "cancelled" | "closed" | "draft" | "pending";

export type CommissionWorkspaceSaleRecord = {
  closedAt: Date | null;
  createdAt: Date;
  id: string;
  isCurrentRevision: boolean;
  listingSnapshot: Record<string, unknown>;
  salePriceCents: number | null;
  sellerUserId: string | null;
  standardCommissionEnabled: boolean;
  status: CommissionWorkspaceSaleStatus;
  unitId: string | null;
  updatedAt: Date;
};

export type ReadCommissionWorkspaceInput = {
  from: Date;
  storeId: string;
  tenantId: string;
  to: Date;
};

export type CommissionWorkspaceSource = {
  entries: readonly FinanceEntryBundle[];
  sales: readonly CommissionWorkspaceSaleRecord[];
  sellerNames: Readonly<Record<string, string>>;
};

export type SettleCommissionEntriesInput = {
  entryIds: readonly string[];
  paidAt: Date;
  sellerUserId: string;
  storeId: string;
  tenantId: string;
};

export type CommissionSettlementWriteResult = {
  changed: boolean;
  entries: readonly FinanceEntry[];
};

export type CommissionWorkspaceRepository = {
  read: (
    input: ReadCommissionWorkspaceInput,
  ) => Promise<CommissionWorkspaceSource>;
  settleEntries: (
    input: SettleCommissionEntriesInput,
  ) => Promise<CommissionSettlementWriteResult>;
};

export class CommissionSettlementConflictError extends Error {
  constructor() {
    super("Commission settlement changed while it was being confirmed.");
    this.name = "CommissionSettlementConflictError";
  }
}
