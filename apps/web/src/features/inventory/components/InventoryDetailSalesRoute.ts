import { getVehicleColorLabel } from "@lojaveiculosv2/shared";
import type { InventoryListingDetail } from "../model/types";

export function buildSalesRouteFromInventoryDetail(
  detail: InventoryListingDetail,
  unitId: string | null,
): string {
  const listing = detail.listing;
  const unit =
    detail.units.find((candidate) => candidate.id === unitId) ??
    detail.units[0] ??
    null;
  const params = new URLSearchParams();

  params.set("listingId", listing.id);
  params.set("listingTitle", listing.title);
  setOptionalParam(params, "unitId", unit?.id);
  setOptionalParam(params, "unitLabel", unit?.stockNumber);
  setOptionalParam(params, "plate", unit?.plate ?? listing.plate);
  setOptionalParam(
    params,
    "colorName",
    unit?.colorName ? getVehicleColorLabel(unit.colorName) : null,
  );
  setOptionalParam(params, "primaryMediaUrl", findPrimaryMediaUrl(detail));
  if (listing.priceCents !== null) {
    params.set("priceCents", String(listing.priceCents));
  }

  return `/sales?${params.toString()}`;
}

function findPrimaryMediaUrl(detail: InventoryListingDetail): string | null {
  const media = [...detail.media].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );
  return (
    media.find((item) => item.isPublic && item.kind === "photo")?.url ??
    media.find((item) => item.kind === "photo")?.url ??
    null
  );
}

function setOptionalParam(
  params: URLSearchParams,
  key: string,
  value: string | null | undefined,
): void {
  if (value) params.set(key, value);
}
