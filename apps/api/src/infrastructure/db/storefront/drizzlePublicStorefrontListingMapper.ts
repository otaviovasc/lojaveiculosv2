import type {
  PublicVehicleListing,
  PublicVehicleMedia,
} from "../../../domains/storefront/ports/publicStorefrontRepository.js";
import type { ListingRow } from "./drizzlePublicStorefrontQueryTypes.js";

export function toPublicVehicleListing(
  row: ListingRow,
  thumbnailUrl: string | null,
  heroMedia: PublicVehicleMedia | null,
): PublicVehicleListing {
  return {
    condition: row.condition,
    description: row.description,
    doors: row.doors,
    engineAspiration: row.engineAspiration,
    engineDisplacement: row.engineDisplacement,
    fuelType: row.fuelType,
    heroMedia,
    id: row.listingId,
    manufactureYear: row.manufactureYear,
    mileageKm: row.mileageKm,
    modelYear: row.modelYear,
    priceCents: row.priceCents,
    slug: assertPublicSlug(row.slug),
    status: "available",
    thumbnailUrl,
    title: row.title,
    transmission: row.transmission,
    trimName: row.trimName,
  };
}

function assertPublicSlug(slug: string | null): string {
  if (!slug) {
    throw new PublicStorefrontDataInvariantError(
      "Published public listing is missing public_slug.",
    );
  }

  return slug;
}

export class PublicStorefrontDataInvariantError extends Error {}
