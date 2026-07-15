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
    commercialTags: listingCommercialTags(row.listingMetadata),
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
    videoUrl: listingVideoUrl(row.listingMetadata),
  };
}

function listingCommercialTags(metadata: unknown): readonly string[] {
  if (!isRecord(metadata) || !Array.isArray(metadata.commercialTags)) return [];
  return Array.from(
    new Set(
      metadata.commercialTags.flatMap((value) => {
        if (typeof value !== "string") return [];
        const tag = value.trim();
        return tag ? [tag.slice(0, 40)] : [];
      }),
    ),
  ).slice(0, 12);
}

function listingVideoUrl(metadata: unknown): string | null {
  if (!isRecord(metadata) || typeof metadata.videoUrl !== "string") return null;
  const value = metadata.videoUrl.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
