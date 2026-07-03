import type { StorefrontMediaAsset } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { StorefrontMediaRepository } from "../../ports/storefrontMediaRepository.js";
import {
  assertStorefrontMediaStorageKey,
  getStorefrontMediaRepository,
  getStorefrontMediaStorage,
  requireStorefrontMediaScope,
  storefrontMediaPermission,
  type StorefrontMediaUploadInput,
  validateStorefrontMediaUpload,
} from "./serviceSupport.js";

export type CompleteStorefrontMediaUploadInput = StorefrontMediaUploadInput & {
  storageKey: string;
};

export async function completeStorefrontMediaUpload(
  context: ServiceContext,
  input: CompleteStorefrontMediaUploadInput,
  ports: {
    repository?: StorefrontMediaRepository;
    storage?: ObjectStorage;
  } = {},
): Promise<StorefrontMediaAsset> {
  assertPermission(context, storefrontMediaPermission);
  validateStorefrontMediaUpload(input);
  const scope = requireStorefrontMediaScope(context);
  assertStorefrontMediaStorageKey(scope, input.storageKey);
  const repository = getStorefrontMediaRepository(ports.repository);
  const storage = getStorefrontMediaStorage(ports.storage);

  const asset = await repository.createAsset(
    { storeId: scope.storeId as never, tenantId: scope.tenantId as never },
    {
      contentType: input.contentType,
      fileName: input.fileName,
      height: input.height ?? null,
      kind: "image",
      publicUrl: storage.getPublicUrl(input.storageKey),
      sizeBytes: input.sizeBytes,
      storageKey: input.storageKey,
      width: input.width ?? null,
    },
  );

  context.logger.info(
    "storefront_media.upload.completed",
    createServiceLogMetadata(context, {
      assetId: asset.id,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
    }),
  );

  await context.audit.record({
    action: "storefront_media.upload.complete",
    actor: context.actor,
    category: "data_change",
    criticality: "medium",
    entityId: asset.id,
    entityType: "storefront_media_asset",
    metadata: {
      contentType: input.contentType,
      permission: storefrontMediaPermission,
      sizeBytes: input.sizeBytes,
      storageKey: input.storageKey,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Completed storefront media upload",
  });

  return asset;
}
