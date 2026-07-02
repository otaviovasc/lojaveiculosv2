import type { StorefrontMediaAsset } from "@lojaveiculosv2/shared";
import type {
  StorefrontMediaAssetCreateInput,
  StorefrontMediaRepository,
  StorefrontMediaScope,
} from "../../../../domains/storefront/ports/storefrontMediaRepository.js";

export function createMemoryStorefrontMediaRepository(): StorefrontMediaRepository {
  const assets = new Map<string, StorefrontMediaAsset[]>();

  return {
    async createAsset(scope, input) {
      const now = new Date().toISOString();
      const asset: StorefrontMediaAsset = {
        contentType: input.contentType,
        createdAt: now,
        fileName: input.fileName,
        height: input.height ?? null,
        id: `storefront_media_${assets.size}_${Date.now()}`,
        kind: input.kind,
        publicUrl: input.publicUrl,
        sizeBytes: input.sizeBytes,
        storageKey: input.storageKey,
        updatedAt: now,
        width: input.width ?? null,
      };
      assets.set(scopeKey(scope), [
        asset,
        ...(assets.get(scopeKey(scope)) ?? []),
      ]);
      return asset;
    },
    async listAssets(scope) {
      return assets.get(scopeKey(scope)) ?? [];
    },
  };
}

function scopeKey(scope: StorefrontMediaScope) {
  return `${scope.tenantId}:${scope.storeId}`;
}
