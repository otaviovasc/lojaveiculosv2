import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  VehicleListing,
  VehicleListingRepository,
} from "../ports/vehicleInventoryRepository.js";
import { VehiclePublicationValidationError } from "./publicationErrors.js";

export async function resolvePublicationSlug(
  context: ServiceContext,
  repository: VehicleListingRepository,
  listing: VehicleListing,
  inputSlug: string | null | undefined,
): Promise<string> {
  const source = publicationSlugSource(listing, inputSlug);
  const slug = normalizeListingSlug(source.value);
  if (!slug) {
    throw new VehiclePublicationValidationError(
      "Vehicle listing public slug is required to publish.",
    );
  }
  if (slug.length > 191) {
    throw new VehiclePublicationValidationError(
      "Vehicle listing public slug must be at most 191 characters.",
    );
  }
  return source.kind === "generated"
    ? resolveUniqueGeneratedSlug(context, repository, listing, slug)
    : assertUniquePublicationSlug(context, repository, listing, slug);
}

function publicationSlugSource(
  listing: VehicleListing,
  inputSlug: string | null | undefined,
): { kind: "explicit" | "generated"; value: string } {
  if (inputSlug !== undefined && inputSlug !== null) {
    return { kind: "explicit", value: inputSlug };
  }
  if (listing.publicSlug)
    return { kind: "explicit", value: listing.publicSlug };
  return {
    kind: "generated",
    value: createDefaultPublicationSlugSource(listing),
  };
}

function createDefaultPublicationSlugSource(listing: VehicleListing): string {
  const idSlug = normalizeListingSlug(listing.id);
  const suffix = idSlug ? `-${idSlug}` : "";
  const titleLength = Math.max(1, 191 - suffix.length);
  const titleSlug = normalizeListingSlug(listing.title)
    .slice(0, titleLength)
    .replace(/-+$/g, "");
  return `${titleSlug}${suffix}`;
}

async function resolveUniqueGeneratedSlug(
  context: ServiceContext,
  repository: VehicleListingRepository,
  listing: VehicleListing,
  baseSlug: string,
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate =
      attempt === 0
        ? baseSlug
        : appendSlugSuffix(baseSlug, String(attempt + 1));
    const existing = await findPublicSlugOwner(context, repository, candidate);
    if (!existing || existing.id === listing.id) return candidate;
  }
  throw new VehiclePublicationValidationError(
    "Vehicle listing public slug could not be made unique.",
  );
}

async function assertUniquePublicationSlug(
  context: ServiceContext,
  repository: VehicleListingRepository,
  listing: VehicleListing,
  slug: string,
): Promise<string> {
  const existing = await findPublicSlugOwner(context, repository, slug);
  if (!existing || existing.id === listing.id) return slug;
  throw new VehiclePublicationValidationError(
    "Vehicle listing public slug is already in use.",
  );
}

function appendSlugSuffix(baseSlug: string, suffix: string): string {
  const separatorLength = 1;
  const baseLength = Math.max(1, 191 - suffix.length - separatorLength);
  const base = baseSlug.slice(0, baseLength).replace(/-+$/g, "");
  return `${base}-${suffix}`;
}

function findPublicSlugOwner(
  context: ServiceContext,
  repository: VehicleListingRepository,
  publicSlug: string,
) {
  return repository.findByPublicSlug({
    publicSlug,
    storeId: context.storeId,
    tenantId: context.tenantId,
  });
}

function normalizeListingSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
