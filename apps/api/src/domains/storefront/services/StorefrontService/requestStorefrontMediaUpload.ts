import type { StorefrontMediaUpload } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { StorefrontMediaRepository } from "../../ports/storefrontMediaRepository.js";
import {
  getStorefrontMediaRepository,
  getStorefrontMediaStorage,
  requireStorefrontMediaScope,
  StorefrontMediaValidationError,
} from "./serviceSupport.js";

const maxImageBytes = 15 * 1024 * 1024;
const permission = "store_public_site.manage";

export type RequestStorefrontMediaUploadInput = {
  contentType: string;
  fileName: string;
  height?: number | null;
  sizeBytes: number;
  width?: number | null;
};

export async function requestStorefrontMediaUpload(
  context: ServiceContext,
  input: RequestStorefrontMediaUploadInput,
  ports: {
    repository?: StorefrontMediaRepository;
    storage?: ObjectStorage;
  } = {},
): Promise<StorefrontMediaUpload> {
  assertPermission(context, permission);
  validateUpload(input);
  const scope = requireStorefrontMediaScope(context);
  const storage = getStorefrontMediaStorage(ports.storage);
  const repository = getStorefrontMediaRepository(ports.repository);

  context.logger.info(
    "storefront_media.upload.requested",
    createServiceLogMetadata(context, {
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
    }),
  );

  const upload = await storage.createUpload({
    contentType: input.contentType,
    fileName: input.fileName,
    scopeSegments: [
      "tenants",
      scope.tenantId,
      "stores",
      scope.storeId,
      "storefront",
      "media",
    ],
    sizeBytes: input.sizeBytes,
  });

  const asset = await repository.createAsset(
    { storeId: scope.storeId as never, tenantId: scope.tenantId as never },
    {
      contentType: input.contentType,
      fileName: input.fileName,
      height: input.height ?? null,
      kind: "image",
      publicUrl: upload.publicUrl,
      sizeBytes: input.sizeBytes,
      storageKey: upload.storageKey,
      width: input.width ?? null,
    },
  );

  await context.audit.record({
    action: "storefront_media.upload.request",
    actor: context.actor,
    category: "data_change",
    criticality: "medium",
    entityId: asset.id,
    entityType: "storefront_media_asset",
    metadata: {
      contentType: input.contentType,
      permission,
      sizeBytes: input.sizeBytes,
      storageKey: upload.storageKey,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Requested storefront media upload URL",
  });

  return { ...upload, asset, expiresAt: upload.expiresAt.toISOString() };
}

function validateUpload(input: RequestStorefrontMediaUploadInput) {
  if (!input.contentType.startsWith("image/")) {
    throw new StorefrontMediaValidationError(
      "Storefront media uploads must be images.",
    );
  }
  if (input.sizeBytes < 1 || input.sizeBytes > maxImageBytes) {
    throw new StorefrontMediaValidationError(
      "Storefront media uploads must be between 1 byte and 15 MiB.",
    );
  }
}
