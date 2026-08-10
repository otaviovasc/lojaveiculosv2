import { DEFAULT_STOREFRONT_ABOUT_IMAGES } from "@lojaveiculosv2/shared";
import type { PublicVehicleListing } from "./types";
import {
  quadraListingMedia,
  type QuadraStorefrontModel,
} from "./quadra/quadraAdapter";

export type StorefrontHeroSlide = {
  alt: string;
  kind: "image" | "video";
  mobileUrl: string | null;
  url: string;
  vehicle: PublicVehicleListing | null;
};

export function createStorefrontHeroSlides(
  model: QuadraStorefrontModel,
): StorefrontHeroSlide[] {
  if (
    model.hero.mediaSource === "banners" &&
    (model.hero.bannerUrls.length || model.hero.bannerMobileUrl)
  ) {
    const bannerUrls = model.hero.bannerUrls.length
      ? model.hero.bannerUrls
      : [model.hero.imageUrl ?? DEFAULT_STOREFRONT_ABOUT_IMAGES.secondary];
    return bannerUrls.map((url, index) => ({
      alt: `Banner promocional ${index + 1}`,
      kind: "image",
      mobileUrl: model.hero.bannerMobileUrl,
      url,
      vehicle: null,
    }));
  }

  const vehicleSlides = model.hero.vehicles.flatMap((vehicle) => {
    const media = quadraListingMedia(vehicle)[0];
    return media
      ? [
          {
            alt: media.altText ?? vehicle.title,
            kind: "image" as const,
            mobileUrl: null,
            url: media.url,
            vehicle,
          },
        ]
      : [];
  });
  if (vehicleSlides.length) return vehicleSlides;

  return [
    {
      alt: `Showroom de ${model.storeName}`,
      kind: model.hero.imageKind,
      mobileUrl:
        model.hero.mediaSource === "banners"
          ? model.hero.bannerMobileUrl
          : null,
      url: model.hero.imageUrl ?? DEFAULT_STOREFRONT_ABOUT_IMAGES.secondary,
      vehicle: null,
    },
  ];
}
