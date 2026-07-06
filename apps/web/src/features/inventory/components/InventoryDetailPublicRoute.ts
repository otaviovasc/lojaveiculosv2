import type { InventoryListingDetail } from "../model/types";

export type InventoryDetailStoreLink = {
  id: string;
  slug: string;
};

export function buildPublicListingUrl(
  detail: InventoryListingDetail,
  stores: readonly InventoryDetailStoreLink[],
): string | null {
  const listing = detail.listing;
  if (listing.status !== "published" || !listing.publicSlug) return null;

  const storeSlug =
    stores.find((store) => store.id === listing.storeId)?.slug ??
    (stores.length === 1 ? stores[0]?.slug : null);

  if (!storeSlug) return null;

  const params = new URLSearchParams({ listing: listing.publicSlug });
  return `/${encodeURIComponent(storeSlug)}?${params.toString()}`;
}
