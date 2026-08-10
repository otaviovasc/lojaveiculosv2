import type {
  InventoryListing,
  InventoryListingDetail,
  InventoryListingSummary,
} from "../inventory/model/types";
import { createInventoryApi } from "../inventory/api/apiClient";
import { createInventoryApiOptions } from "../inventory/api/inventoryRuntimeApi";
import { createRuntimeSettingsApi } from "../settings/runtimeSettingsApi";
import type { StoreSettingsSnapshot } from "../settings/types";
import type { PublicStorefrontApi } from "./apiClient";
import type {
  PublicStorefrontData,
  PublicStorefrontListingDetailData,
  PublicStorefrontSettingsData,
  PublicVehicleListing,
  PublicVehicleMedia,
} from "./types";

/**
 * The editor can preview draft storefront settings. Anonymous storefront
 * reads must continue to hide an unpublished store.
 */
export function createEditorPreviewStorefrontApi(
  publicApi: PublicStorefrontApi,
): PublicStorefrontApi {
  const settingsApi = createRuntimeSettingsApi();

  return {
    getCustomPage: publicApi.getCustomPage,
    getListing: async (listingSlug) => {
      const [settings, inventory] = await Promise.all([
        settingsApi.getStoreSettings(),
        createRuntimeInventoryApi(),
      ]);
      const summaries = await listAllPreviewInventory(inventory);
      const summary = findListing(summaries, listingSlug);
      if (!summary) throw new Error("Preview vehicle not found.");
      const detail = await inventory.getListing(summary.listing.id);
      return toPublicListingDetail(detail, settings);
    },
    getSettings: async () =>
      toPublicSettings(await settingsApi.getStoreSettings()),
    listListings: async (query) => {
      const [settings, inventory] = await Promise.all([
        settingsApi.getStoreSettings(),
        createRuntimeInventoryApi(),
      ]);
      const summaries = (await listAllPreviewInventory(inventory)).filter(
        ({ listing }) => listing.status === "published",
      );
      const limit = query?.limit ?? 24;
      const offset = query?.offset ?? 0;
      return toPublicStorefrontData(
        settings,
        summaries.slice(offset, offset + limit),
      );
    },
    submitListingInterest: publicApi.submitListingInterest,
  };
}

async function createRuntimeInventoryApi() {
  return createInventoryApi(await createInventoryApiOptions());
}

async function listAllPreviewInventory(
  inventory: Awaited<ReturnType<typeof createRuntimeInventoryApi>>,
): Promise<readonly InventoryListingSummary[]> {
  const summaries: InventoryListingSummary[] = [];
  let offset = 0;

  while (true) {
    const result = await inventory.listListings({ limit: 100, offset });
    summaries.push(...result.items);

    if (!result.hasMore || result.nextOffset === null) return summaries;
    offset = result.nextOffset;
  }
}

function toPublicStorefrontData(
  settings: StoreSettingsSnapshot,
  summaries: readonly InventoryListingSummary[],
): PublicStorefrontData {
  return {
    listings: summaries
      .filter(({ listing }) => listing.status === "published")
      .map(toPublicListing),
    store: toPublicStoreSummary(settings),
  };
}

function toPublicSettings(
  settings: StoreSettingsSnapshot,
): PublicStorefrontSettingsData {
  const phone = settings.profile.whatsappPhone;
  return {
    contact: {
      addressCity: settings.profile.addressCity,
      addressLine1: settings.profile.addressLine1,
      addressLine2: settings.profile.addressLine2,
      addressState: settings.profile.addressState,
      addressZipCode: settings.profile.addressZipCode,
      businessHours: settings.profile.businessHours,
      city: settings.profile.addressCity,
      contactEmail: settings.profile.contactEmail,
      contactPhone: settings.profile.contactPhone,
      whatsappPhone: phone,
      whatsappUrl: phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : null,
    },
    site: {
      heroImageUrl: settings.publicSite.heroImageUrl,
      layoutKey: settings.publicSite.layoutKey,
      seoDescription: settings.publicSite.seoDescription,
      seoTitle: settings.publicSite.seoTitle,
      theme: settings.publicSite.theme,
    },
    store: {
      name: settings.identity.tradingName,
      publicUrl:
        settings.publicSite.customDomain ??
        `${settings.identity.publicSlug}.lojaveiculos.com.br`,
      slug: settings.identity.publicSlug,
    },
  };
}

function toPublicStoreSummary(settings: StoreSettingsSnapshot) {
  return {
    name: settings.identity.tradingName,
    slug: settings.identity.publicSlug,
  };
}

function toPublicListing(
  source: InventoryListingSummary,
): PublicVehicleListing {
  const listing = source.listing;
  const heroMedia = source.primaryMediaUrl
    ? toPublicMedia({
        altText: null,
        displayOrder: 0,
        kind: "photo",
        unitId: source.primaryUnit?.id ?? listing.id,
        url: source.primaryMediaUrl,
      })
    : null;

  return toPublicListingFields(listing, heroMedia ? [heroMedia] : []);
}

function toPublicListingDetail(
  source: InventoryListingDetail,
  settings: StoreSettingsSnapshot,
): PublicStorefrontListingDetailData {
  const media = source.media
    .filter((item) => item.isPublic)
    .map((item) => toPublicMedia(item));
  const listing = toPublicListingFields(source.listing, media);
  const mediaGroups = source.units.map((unit) => ({
    colorName: unit.colorName,
    media: media.filter((item) => item.unitId === unit.id),
    unitId: unit.id,
  }));

  return {
    listing: { ...listing, mediaGroups },
    store: toPublicStoreSummary(settings),
  };
}

function toPublicListingFields(
  listing: InventoryListing,
  media: readonly PublicVehicleMedia[],
): PublicVehicleListing {
  const heroMedia = media[0] ?? null;
  return {
    commercialTags: listing.commercialTags,
    condition: "used",
    description: listing.description,
    doors: listing.doors,
    engineAspiration: listing.engineAspiration,
    engineDisplacement: listing.engineDisplacement,
    fuelType: listing.fuelType,
    heroMedia,
    manufactureYear: listing.manufactureYear,
    media,
    mileageKm: listing.mileageKm,
    modelYear: listing.modelYear,
    priceCents: listing.priceCents,
    slug: listing.publicSlug ?? listing.id,
    status: "available",
    thumbnailUrl: heroMedia?.url ?? null,
    title: listing.title,
    transmission: listing.transmission,
    trimName: listing.trimName,
    videoUrl: listing.videoUrl,
  };
}

function toPublicMedia(source: {
  altText: string | null;
  displayOrder: number;
  kind: PublicVehicleMedia["kind"];
  unitId: string;
  url: string;
}): PublicVehicleMedia {
  return {
    altText: source.altText,
    displayOrder: source.displayOrder,
    kind: source.kind,
    unitColorName: null,
    unitId: source.unitId,
    url: source.url,
  };
}

function findListing(
  summaries: readonly InventoryListingSummary[],
  listingSlug: string,
) {
  return summaries.find(
    ({ listing }) =>
      listing.publicSlug === listingSlug || listing.id === listingSlug,
  );
}
