import type { StorefrontMediaAsset } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { StorefrontMediaRepository } from "../../ports/storefrontMediaRepository.js";
import {
  getStorefrontMediaRepository,
  requireStorefrontMediaScope,
} from "./serviceSupport.js";

const permission = "store_public_site.manage";

export async function listStorefrontMediaAssets(
  context: ServiceContext,
  repository?: StorefrontMediaRepository,
): Promise<readonly StorefrontMediaAsset[]> {
  assertPermission(context, permission);
  const scope = requireStorefrontMediaScope(context);
  const mediaRepository = getStorefrontMediaRepository(repository);

  context.logger.info(
    "storefront_media.list.started",
    createServiceLogMetadata(context),
  );

  const assets = await mediaRepository.listAssets({
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  await context.audit.record({
    action: "storefront_media.list",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "store",
    metadata: { assetCount: assets.length, permission },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Listed storefront media library assets",
  });

  return assets;
}
