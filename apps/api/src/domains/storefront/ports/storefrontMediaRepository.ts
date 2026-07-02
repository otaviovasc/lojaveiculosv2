import type {
  StorefrontMediaAsset,
  StorefrontMediaAssetKind,
  StoreId,
  TenantId,
} from "@lojaveiculosv2/shared";

export type StorefrontMediaScope = {
  storeId: StoreId;
  tenantId: TenantId;
};

export type StorefrontMediaAssetCreateInput = {
  contentType: string;
  fileName: string;
  height?: number | null;
  kind: StorefrontMediaAssetKind;
  publicUrl: string;
  sizeBytes: number;
  storageKey: string;
  width?: number | null;
};

export type StorefrontMediaRepository = {
  createAsset: (
    scope: StorefrontMediaScope,
    input: StorefrontMediaAssetCreateInput,
  ) => Promise<StorefrontMediaAsset>;
  listAssets: (
    scope: StorefrontMediaScope,
  ) => Promise<readonly StorefrontMediaAsset[]>;
};
