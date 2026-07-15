import { vi } from "vitest";
import type { CommissionWorkspaceRepository } from "./ports/commissionWorkspaceRepository.js";
import type { FinanceEntryBundle } from "./ports/financeRepository.js";
import { createServiceContext } from "../../shared/serviceContext.js";

export function commissionRepository(
  source: Awaited<ReturnType<CommissionWorkspaceRepository["read"]>>,
): CommissionWorkspaceRepository {
  return {
    read: vi.fn(async () => source),
    settleEntries: vi.fn(async () => ({ changed: false, entries: [] })),
  };
}

export function context(permissions: string[]) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions,
    request: { requestId: "request_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

export function period() {
  return {
    from: new Date("2026-07-01T00:00:00.000Z"),
    to: new Date("2026-07-31T23:59:59.999Z"),
  };
}

export function sale(id: string, sellerUserId: string, salePriceCents: number) {
  return {
    closedAt: new Date("2026-07-10T12:00:00.000Z"),
    createdAt: new Date("2026-07-01T12:00:00.000Z"),
    id,
    isCurrentRevision: true,
    listingSnapshot: { title: `Vehicle ${id}` },
    salePriceCents,
    sellerUserId,
    standardCommissionEnabled: true,
    status: "closed" as const,
    unitId: `unit_${id}`,
    updatedAt: new Date("2026-07-10T12:00:00.000Z"),
  };
}

export function bundle(
  id: string,
  sellerUserId: string,
  saleId: string,
): FinanceEntryBundle {
  const now = new Date("2026-07-10T12:00:00.000Z");
  return {
    entry: {
      amountCents: 10000,
      category: "sales_commission",
      createdAt: now,
      dueAt: now,
      id,
      metadata: {
        automaticFinanceEntry: { family: "sale.standard_commission" },
      },
      name: `Commission ${id}`,
      paidAt: null,
      sellerUserId,
      status: "pending",
      storeId: "store_1",
      tenantId: "tenant_1",
      type: "commission",
      updatedAt: now,
    },
    links: [
      {
        createdAt: now,
        entryId: id,
        id: `link_${id}`,
        storeId: "store_1",
        targetId: saleId,
        targetType: "sale",
        tenantId: "tenant_1",
        updatedAt: now,
      },
    ],
  };
}

export function settlementEntry(
  sellerUserId: string,
  family = "sale.standard_commission",
) {
  return {
    id: "entry_1",
    metadata: {
      automaticFinanceEntry: { family },
    },
    sellerUserId,
  };
}
