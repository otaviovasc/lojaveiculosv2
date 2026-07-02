export type StorefrontMediaAssetKind = "image";

export type StorefrontMediaAsset = {
  contentType: string;
  createdAt: string;
  fileName: string;
  height: number | null;
  id: string;
  kind: StorefrontMediaAssetKind;
  publicUrl: string;
  sizeBytes: number;
  storageKey: string;
  updatedAt: string;
  width: number | null;
};

export type StorefrontMediaUpload = {
  asset: StorefrontMediaAsset;
  expiresAt: string;
  publicUrl: string;
  storageKey: string;
  uploadHeaders: Record<string, string>;
  uploadMethod: "PUT";
  uploadUrl: string;
};
