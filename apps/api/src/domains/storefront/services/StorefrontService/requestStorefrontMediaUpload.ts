import type { StorefrontMediaUpload } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  createStorefrontMediaScopeSegments,
  getStorefrontMediaStorage,
  requireStorefrontMediaScope,
  storefrontMediaPermission,
  type StorefrontMediaUploadInput,
  validateStorefrontMediaUpload,
} from "./serviceSupport.js";

export type RequestStorefrontMediaUploadInput = StorefrontMediaUploadInput;

export async function requestStorefrontMediaUpload(
  context: ServiceContext,
  input: RequestStorefrontMediaUploadInput,
  ports: {
    storage?: ObjectStorage;
  } = {},
): Promise<StorefrontMediaUpload> {
  assertPermission(context, storefrontMediaPermission);
  validateStorefrontMediaUpload(input);
  const scope = requireStorefrontMediaScope(context);
  const storage = getStorefrontMediaStorage(ports.storage);

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
    scopeSegments: createStorefrontMediaScopeSegments(scope),
    sizeBytes: input.sizeBytes,
  });

  await context.audit.record({
    action: "storefront_media.upload.request",
    actor: context.actor,
    category: "data_change",
    criticality: "medium",
    entityId: upload.storageKey,
    entityType: "storefront_media_upload",
    metadata: {
      contentType: input.contentType,
      permission: storefrontMediaPermission,
      sizeBytes: input.sizeBytes,
      storageKey: upload.storageKey,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Requested storefront media upload URL",
  });

  return { ...upload, expiresAt: upload.expiresAt.toISOString() };
}
