import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  PublicStorefrontRepository,
  PublicStorefrontSiteResult,
  PublicStorefrontSiteSnapshot,
} from "../../ports/publicStorefrontRepository.js";
import {
  getPublicStorefrontRepository,
  PublicStorefrontNotFoundError,
} from "./serviceSupport.js";

const permission = "public_storefront.read";

export type GetPublicStorefrontSiteInput = {
  storeSlug: string;
};

export async function getPublicStorefrontSite(
  context: ServiceContext,
  input: GetPublicStorefrontSiteInput,
  repository?: PublicStorefrontRepository,
): Promise<PublicStorefrontSiteResult> {
  assertPermission(context, permission);
  const storefrontRepository = getPublicStorefrontRepository(repository);

  context.logger.info(
    "public_storefront.site.get.started",
    createServiceLogMetadata(context, { storeSlug: input.storeSlug }),
  );

  const site = await storefrontRepository.findPublicSiteBySlug(input.storeSlug);
  if (!site) throw new PublicStorefrontNotFoundError(input.storeSlug);

  await context.audit.record({
    action: "public_storefront.site.get",
    actor: context.actor,
    category: "data_access",
    entityId: site.store.id,
    entityType: "store",
    metadata: { permission, storeSlug: input.storeSlug },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: site.store.id,
    tenantId: site.store.tenantId,
    summary: "Read public storefront site settings",
  });

  return toPublicResult(site);
}

function toPublicResult(
  snapshot: PublicStorefrontSiteSnapshot,
): PublicStorefrontSiteResult {
  return {
    contact: snapshot.contact,
    site: snapshot.site,
    store: {
      name: snapshot.store.name,
      publicUrl: snapshot.store.publicUrl,
      slug: snapshot.store.slug,
    },
  };
}
