import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { StorefrontPageRepository } from "../../ports/storefrontPageRepository.js";
import {
  getStorefrontPageRepository,
  requireStorefrontPageScope,
  StorefrontPageNotFoundError,
} from "./serviceSupport.js";

const permission = "store_public_site.manage";

export async function deleteStorefrontCustomPage(
  context: ServiceContext,
  pageId: string,
  repository?: StorefrontPageRepository,
) {
  assertPermission(context, permission);
  const scope = requireStorefrontPageScope(context);
  const pageRepository = getStorefrontPageRepository(repository);

  context.logger.info(
    "storefront_pages.delete.started",
    createServiceLogMetadata(context, { pageId }),
  );

  const deleted = await pageRepository.deleteCustomPage({
    pageId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!deleted) throw new StorefrontPageNotFoundError(pageId);

  await context.audit.record({
    action: "storefront_pages.delete",
    actor: context.actor,
    category: "data_change",
    criticality: "high",
    entityId: pageId,
    entityType: "store_custom_page",
    metadata: { permission },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Deleted storefront custom page",
  });

  return { deleted: true };
}
