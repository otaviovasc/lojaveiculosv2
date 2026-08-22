import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";

export type AgencyTeamAccessStore = {
  storeId: StoreId;
  storeName: string;
  storeSlug: string;
};

export type AgencyTeamAccessStoreDirectory = {
  listStores: (input: {
    tenantId: TenantId;
    userId: UserId;
  }) => Promise<readonly AgencyTeamAccessStore[]>;
};
