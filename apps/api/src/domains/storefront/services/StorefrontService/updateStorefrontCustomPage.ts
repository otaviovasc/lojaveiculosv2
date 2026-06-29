import { normalizeStorefrontPageSlug } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  StorefrontPageRepository,
  StorefrontPageUpdateInput,
} from "../../ports/storefrontPageRepository.js";
import {
  getStorefrontPageRepository,
  requireStorefrontPageScope,
  StorefrontPageNotFoundError,
} from "./serviceSupport.js";

const permission = "store_public_site.manage";

export async function updateStorefrontCustomPage(
  context: ServiceContext,
  pageId: string,
  input: StorefrontPageUpdateInput,
  repository?: StorefrontPageRepository,
) {
  assertPermission(context, permission);
  const scope = requireStorefrontPageScope(context);
  const pageRepository = getStorefrontPageRepository(repository);
  const update = normalizeUpdate(input);

  context.logger.info(
    "storefront_pages.update.started",
    createServiceLogMetadata(context, {
      changedFields: Object.keys(update),
      pageId,
    }),
  );

  const page = await pageRepository.updateCustomPage(
    {
      pageId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    },
    update,
  );
  if (!page) throw new StorefrontPageNotFoundError(pageId);

  await context.audit.record({
    action: "storefront_pages.update",
    actor: context.actor,
    category: "data_change",
    criticality: "high",
    entityId: page.id,
    entityType: "store_custom_page",
    metadata: { changedFields: Object.keys(update), permission },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Updated storefront custom page",
  });

  return page;
}

function normalizeUpdate(
  input: StorefrontPageUpdateInput,
): StorefrontPageUpdateInput {
  return {
    ...input,
    ...(input.slug !== undefined
      ? { slug: normalizeStorefrontPageSlug(input.slug) }
      : {}),
  };
}
