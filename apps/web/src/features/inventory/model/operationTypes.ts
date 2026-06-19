export type InventoryCostKind =
  | "acquisition"
  | "fee"
  | "other"
  | "preparation"
  | "repair"
  | "tax"
  | "transport";

export type InventoryCost = {
  amountCents: number;
  costDate: string;
  createdAt: string;
  description: string | null;
  id: string;
  kind: InventoryCostKind;
  storeId: string | null;
  tenantId: string | null;
  unitId: string;
  updatedAt: string;
};

export type InventoryPriceHistoryEntry = {
  actorUserId: string | null;
  changedAt: string;
  id: string;
  listingId: string;
  newPriceCents: number | null;
  oldPriceCents: number | null;
  reason: string | null;
};

export type InventoryStatusHistoryEntry = {
  actorUserId: string | null;
  changedAt: string;
  fromStatus: string | null;
  id: string;
  listingId: string | null;
  reason: string | null;
  target: "listing" | "unit";
  toStatus: string;
  unitId: string | null;
};

export type CreateInventoryCostInput = {
  amountCents: number;
  costDate?: string;
  description?: string | null;
  kind: InventoryCostKind;
  unitId?: string;
};
