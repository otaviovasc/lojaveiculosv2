import { normalizeStorefrontPageSlug } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  StorefrontPageCreateInput,
  StorefrontPageRepository,
} from "../../ports/storefrontPageRepository.js";
import {
  getStorefrontPageRepository,
  requireStorefrontPageScope,
} from "./serviceSupport.js";

const permission = "store_public_site.manage";

export async function createStorefrontCustomPage(
  context: ServiceContext,
  input: StorefrontPageCreateInput,
  repository?: StorefrontPageRepository,
) {
  assertPermission(context, permission);
  const scope = requireStorefrontPageScope(context);
  const pageRepository = getStorefrontPageRepository(repository);
  const existingPages = await pageRepository.listCustomPages({
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  const slug = normalizeStorefrontPageSlug(input.slug);

  context.logger.info(
    "storefront_pages.create.started",
    createServiceLogMetadata(context, { slug }),
  );

  const page = await pageRepository.createCustomPage(
    { storeId: scope.storeId as never, tenantId: scope.tenantId as never },
    {
      ...input,
      order: nextPageOrder(existingPages),
      secretToken: crypto.randomUUID(),
      slug,
    },
  );

  await context.audit.record({
    action: "storefront_pages.create",
    actor: context.actor,
    category: "data_change",
    criticality: "high",
    entityId: page.id,
    entityType: "store_custom_page",
    metadata: { permission, slug: page.slug },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Created storefront custom page",
  });

  return page;
}

function nextPageOrder(pages: readonly { order: number }[]) {
  return pages.reduce((max, page) => Math.max(max, page.order), -1) + 1;
}
