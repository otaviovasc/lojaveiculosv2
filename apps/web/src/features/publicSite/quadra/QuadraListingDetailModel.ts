import {
  createPhoneHref,
  createWhatsappUrl,
  yearLabel,
} from "../PublicListingDetailParts";
import {
  formatPublicVehicleFuel,
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
  formatPublicVehicleTransmission,
} from "../publicVehicleFormatters";
import type {
  PublicStorefrontListingDetailData,
  PublicVehicleMedia,
} from "../types";
import type { QuadraStorefrontModel } from "./quadraAdapter";

export type QuadraDetailMediaGroup = {
  id: string;
  label: string;
  media: readonly PublicVehicleMedia[];
};

export type QuadraDetailSpec = {
  label: string;
  value: string;
};

export function createQuadraDetailMediaGroups(
  detail: PublicStorefrontListingDetailData,
): readonly QuadraDetailMediaGroup[] {
  const groups = detail.listing.mediaGroups
    .filter((group) => group.media.length > 0)
    .map((group, index) => ({
      id: group.unitId,
      label: group.colorName ?? `Opção ${index + 1}`,
      media: sortMedia(group.media),
    }));
  if (groups.length > 0) return groups;

  return [
    {
      id: "listing",
      label: "Fotos do veículo",
      media: fallbackListingMedia(detail),
    },
  ];
}

export function createQuadraDetailSpecs(
  detail: PublicStorefrontListingDetailData,
  colorNames: readonly string[],
): readonly QuadraDetailSpec[] {
  const listing = detail.listing;
  return [
    {
      label: "Ano",
      value: yearLabel(listing.manufactureYear, listing.modelYear),
    },
    {
      label: "Quilometragem",
      value: formatPublicVehicleMileage(listing.mileageKm),
    },
    {
      label: "Câmbio",
      value: formatPublicVehicleTransmission(listing.transmission),
    },
    {
      label: "Combustível",
      value: formatPublicVehicleFuel(listing.fuelType),
    },
    { label: "Cor", value: colorNames.join(", ") || "-" },
    {
      label: "Portas",
      value: listing.doors ? `${listing.doors} portas` : "-",
    },
  ];
}

export function quadraDetailPrice(detail: PublicStorefrontListingDetailData) {
  return formatPublicVehiclePrice(detail.listing.priceCents);
}

export function quadraDetailWhatsappUrl(
  model: QuadraStorefrontModel,
  title: string,
) {
  const configured = model.contact.whatsappUrl;
  if (!configured) return createWhatsappUrl(model.contact.phone, title);
  if (/[?&]text=/.test(configured)) return configured;
  const separator = configured.includes("?") ? "&" : "?";
  const message = encodeURIComponent(
    `Olá! Tenho interesse no veículo: ${title}`,
  );
  return `${configured}${separator}text=${message}`;
}

export function quadraDetailPhoneHref(model: QuadraStorefrontModel) {
  return createPhoneHref(model.contact.phone);
}

export function quadraDetailLeadFormVisible(theme: Record<string, unknown>) {
  const legacy = record(theme.lead_form);
  const current = record(theme.leadForm);
  const configured = legacy.show_on_vehicle ?? current.showOnVehicle;
  return typeof configured === "boolean" ? configured : true;
}

function fallbackListingMedia(
  detail: PublicStorefrontListingDetailData,
): readonly PublicVehicleMedia[] {
  const candidates = [
    ...detail.listing.media,
    ...(detail.listing.heroMedia ? [detail.listing.heroMedia] : []),
  ];
  if (candidates.length === 0 && detail.listing.thumbnailUrl) {
    candidates.push({
      altText: detail.listing.title,
      displayOrder: 0,
      kind: "photo",
      unitColorName: null,
      unitId: "listing",
      url: detail.listing.thumbnailUrl,
    });
  }
  if (
    detail.listing.videoUrl &&
    !candidates.some((media) => media.url === detail.listing.videoUrl)
  ) {
    candidates.push({
      altText: detail.listing.title,
      displayOrder: candidates.length,
      kind: "video",
      unitColorName: null,
      unitId: "listing",
      url: detail.listing.videoUrl,
    });
  }
  const seen = new Set<string>();
  return sortMedia(
    candidates.filter((media) => {
      if (seen.has(media.url)) return false;
      seen.add(media.url);
      return true;
    }),
  );
}

function sortMedia(media: readonly PublicVehicleMedia[]) {
  return [...media].sort((left, right) =>
    left.displayOrder === right.displayOrder
      ? left.url.localeCompare(right.url)
      : left.displayOrder - right.displayOrder,
  );
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
