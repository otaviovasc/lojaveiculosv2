import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  createVehicleVitrineComponents,
  createVehicleVitrinePageSlug,
} from "../../builders/vehicleVitrineComponents.js";
import type { PublicStorefrontRepository } from "../../ports/publicStorefrontRepository.js";
import type { StorefrontPageRepository } from "../../ports/storefrontPageRepository.js";
import {
  getPublicStorefrontRepository,
  getStorefrontPageRepository,
  PublicStorefrontRepositoryError,
  requireStorefrontPageScope,
  StorefrontPageRepositoryError,
  StorefrontVehicleVitrineSourceNotFoundError,
} from "./serviceSupport.js";

export async function createOrReuseVehicleVitrine(
  context: ServiceContext,
  input: { listingId: string; visible: boolean },
  ports: {
    pageRepository?: StorefrontPageRepository;
    publicRepository?: PublicStorefrontRepository | undefined;
  },
) {
  assertPermission(context, "inventory.read");
  assertPermission(context, "store_public_site.manage");
  const scope = requireStorefrontPageScope(context);
  context.logger.info(
    "storefront_pages.vehicle_vitrine.upsert.started",
    createServiceLogMetadata(context, input),
  );
  const publicRepository = getPublicStorefrontRepository(
    ports.publicRepository,
  );
  const pageRepository = getStorefrontPageRepository(ports.pageRepository);
  if (!publicRepository.findPublicListingDetailById) {
    throw new PublicStorefrontRepositoryError();
  }
  if (!pageRepository.createOrReuseVehicleVitrine) {
    throw new StorefrontPageRepositoryError();
  }

  const listing = await publicRepository.findPublicListingDetailById({
    listingId: input.listingId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!listing) {
    throw new StorefrontVehicleVitrineSourceNotFoundError(input.listingId);
  }

  const page = await pageRepository.createOrReuseVehicleVitrine(
    { storeId: scope.storeId as never, tenantId: scope.tenantId as never },
    {
      components: createVehicleVitrineComponents(listing),
      description: `Página comercial do veículo ${listing.title}.`,
      listingId: listing.id,
      slug: createVehicleVitrinePageSlug(listing),
      title: `${listing.title} - Oferta Exclusiva`,
      visible: input.visible,
    },
  );

  await context.audit.record({
    action: "storefront_pages.vehicle_vitrine.upsert",
    actor: context.actor,
    category: "data_change",
    criticality: "high",
    entityId: page.id,
    entityType: "store_custom_page",
    metadata: { listingId: listing.id, visible: input.visible },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Created or reused vehicle storefront page",
  });

  return page;
}
