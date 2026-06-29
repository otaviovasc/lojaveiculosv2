import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  PublicStorefrontCustomPageSnapshot,
  StorefrontPageRepository,
} from "../../ports/storefrontPageRepository.js";
import {
  getStorefrontPageRepository,
  StorefrontPageNotFoundError,
} from "./serviceSupport.js";

const permission = "public_storefront.read";

export type GetPublicStorefrontCustomPageInput = {
  pageSlug: string;
  storeSlug: string;
  token?: string | null;
};

export async function getPublicStorefrontCustomPage(
  context: ServiceContext,
  input: GetPublicStorefrontCustomPageInput,
  repository?: StorefrontPageRepository,
): Promise<PublicStorefrontCustomPageSnapshot> {
  assertPermission(context, permission);
  const pageRepository = getStorefrontPageRepository(repository);

  context.logger.info(
    "public_storefront.custom_page.get.started",
    createServiceLogMetadata(context, {
      pageSlug: input.pageSlug,
      storeSlug: input.storeSlug,
    }),
  );

  const snapshot = await pageRepository.findPublicCustomPageBySlug({
    pageSlug: input.pageSlug,
    storeSlug: input.storeSlug,
  });
  if (!snapshot || !canReadPage(snapshot, input.token)) {
    throw new StorefrontPageNotFoundError(input.pageSlug);
  }

  await context.audit.record({
    action: "public_storefront.custom_page.get",
    actor: context.actor,
    category: "data_access",
    entityId: snapshot.page.id,
    entityType: "store_custom_page",
    metadata: { pageSlug: input.pageSlug, permission },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: snapshot.store.id,
    tenantId: snapshot.store.tenantId,
    summary: "Read public storefront custom page",
  });

  return snapshot;
}

function canReadPage(
  snapshot: PublicStorefrontCustomPageSnapshot,
  token?: string | null,
) {
  if (snapshot.sitePublished && snapshot.page.visible) return true;
  return Boolean(token && token === snapshot.page.secretToken);
}
