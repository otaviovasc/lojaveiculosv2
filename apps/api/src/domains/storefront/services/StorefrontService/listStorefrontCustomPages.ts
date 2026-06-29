import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { StorefrontCustomPage } from "@lojaveiculosv2/shared";
import type { StorefrontPageRepository } from "../../ports/storefrontPageRepository.js";
import {
  getStorefrontPageRepository,
  requireStorefrontPageScope,
} from "./serviceSupport.js";

const permission = "store_public_site.manage";

export async function listStorefrontCustomPages(
  context: ServiceContext,
  repository?: StorefrontPageRepository,
): Promise<readonly StorefrontCustomPage[]> {
  assertPermission(context, permission);
  const scope = requireStorefrontPageScope(context);
  const pageRepository = getStorefrontPageRepository(repository);

  context.logger.info(
    "storefront_pages.list.started",
    createServiceLogMetadata(context),
  );

  const pages = await pageRepository.listCustomPages({
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  await context.audit.record({
    action: "storefront_pages.list",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "store",
    metadata: { pageCount: pages.length, permission },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Listed storefront custom pages",
  });

  return pages;
}
