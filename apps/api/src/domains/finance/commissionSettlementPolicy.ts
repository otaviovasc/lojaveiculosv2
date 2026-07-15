export type CommissionSettlementSaleLink = {
  entryId: string;
  targetId: string;
};

export type CommissionSettlementSaleState = {
  deletedAt: Date | null;
  id: string;
  isCurrentRevision: boolean;
  isDeleted: boolean;
  sellerUserId: string | null;
  status: "cancelled" | "closed" | "draft" | "pending";
};

export type CommissionSettlementEntryState = {
  id: string;
  metadata: Record<string, unknown>;
  sellerUserId: string | null;
};

export function hasUnsafeCommissionSettlementSaleLink(
  links: readonly CommissionSettlementSaleLink[],
  saleRows: readonly CommissionSettlementSaleState[],
  entries: readonly CommissionSettlementEntryState[],
) {
  const linkCountByEntry = new Map<string, number>();
  for (const link of links) {
    linkCountByEntry.set(
      link.entryId,
      (linkCountByEntry.get(link.entryId) ?? 0) + 1,
    );
  }
  if ([...linkCountByEntry.values()].some((count) => count !== 1)) return true;

  const salesById = new Map(saleRows.map((sale) => [sale.id, sale]));
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  return links.some((link) => {
    const sale = salesById.get(link.targetId);
    const entry = entriesById.get(link.entryId);
    return (
      !sale ||
      !entry ||
      sale.status !== "closed" ||
      !sale.isCurrentRevision ||
      sale.isDeleted ||
      Boolean(sale.deletedAt) ||
      (isStandardSaleCommission(entry.metadata) &&
        sale.sellerUserId !== entry.sellerUserId)
    );
  });
}

export function isStandardSaleCommission(metadata: Record<string, unknown>) {
  const automatic = metadata.automaticFinanceEntry;
  if (!automatic || typeof automatic !== "object" || Array.isArray(automatic)) {
    return false;
  }
  return (
    (automatic as Record<string, unknown>).family === "sale.standard_commission"
  );
}
