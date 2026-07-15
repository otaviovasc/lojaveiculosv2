import {
  CommissionSettlementConflictError,
  type CommissionWorkspaceRepository,
} from "../../../../domains/finance/ports/commissionWorkspaceRepository.js";
import type { FinanceRepository } from "../../../../domains/finance/ports/financeRepository.js";

export function createMemoryCommissionWorkspaceRepository(
  financeRepository: FinanceRepository,
): CommissionWorkspaceRepository {
  return {
    async read(input) {
      const entries = await financeRepository.list({
        limit: 10_000,
        offset: 0,
        storeId: input.storeId,
        tenantId: input.tenantId,
        type: "commission",
      });
      return {
        entries: entries.filter(
          ({ entry }) =>
            entry.createdAt >= input.from && entry.createdAt <= input.to,
        ),
        sales: [],
        sellerNames: {},
      };
    },
    async settleEntries(input) {
      const entries = await financeRepository.list({
        limit: 10_000,
        offset: 0,
        storeId: input.storeId,
        tenantId: input.tenantId,
        type: "commission",
      });
      const selected = entries.filter(
        ({ entry }) =>
          input.entryIds.includes(entry.id) &&
          entry.sellerUserId === input.sellerUserId,
      );
      if (selected.length !== new Set(input.entryIds).size) {
        throw new CommissionSettlementConflictError();
      }
      if (
        selected.every(
          ({ entry }) =>
            entry.status === "paid" &&
            entry.paidAt?.getTime() === input.paidAt.getTime(),
        )
      ) {
        return {
          changed: false,
          entries: selected.map(({ entry }) => entry),
        };
      }
      if (selected.some(({ entry }) => entry.status !== "pending")) {
        throw new CommissionSettlementConflictError();
      }
      const updatedEntries = await Promise.all(
        selected.map(({ entry }) =>
          financeRepository
            .updateEntry({
              entryId: entry.id,
              paidAt: input.paidAt,
              status: "paid",
              storeId: input.storeId,
              tenantId: input.tenantId,
            })
            .then((bundle) => bundle.entry),
        ),
      );
      return { changed: true, entries: updatedEntries };
    },
  };
}
