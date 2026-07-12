import { useEffect, useMemo, useState } from "react";
import type { PublicVehicleListing, PublicVehicleMedia } from "./types";

const heroMediaIntervalMs = 5000;

type HeroMediaSource = "auto" | "banners" | "vehicles";

type PublicHeroMedia = {
  altText: string;
  kind: "image" | "video";
  url: string;
};

export function PublicStorefrontHeroMedia({
  heroImageUrl,
  listings,
  theme,
}: {
  heroImageUrl: string | null;
  listings: readonly PublicVehicleListing[];
  theme: Record<string, unknown>;
}) {
  const media = useMemo(
    () => resolvePublicStorefrontHeroMedia({ heroImageUrl, listings, theme }),
    [heroImageUrl, listings, theme],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [media]);

  useEffect(() => {
    if (media.length <= 1) return undefined;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % media.length);
    }, heroMediaIntervalMs);
    return () => window.clearInterval(interval);
  }, [media.length]);

  const activeMedia = media[activeIndex % media.length];
  if (!activeMedia) {
    return (
      <div className="size-full bg-gradient-to-br from-zinc-900 to-zinc-950" />
    );
  }

  if (activeMedia.kind === "video") {
    return (
      <video
        aria-label={activeMedia.altText || "Video de destaque"}
        autoPlay
        className="size-full object-cover opacity-60"
        loop
        muted
        playsInline
        src={activeMedia.url}
      />
    );
  }

  return (
    <img
      alt={activeMedia.altText}
      className="size-full scale-105 object-cover opacity-60 transition-transform duration-[4000ms] hover:scale-100"
      key={activeMedia.url}
      src={activeMedia.url}
    />
  );
}

export function resolvePublicStorefrontHeroMedia({
  heroImageUrl,
  listings,
  theme,
}: {
  heroImageUrl: string | null;
  listings: readonly PublicVehicleListing[];
  theme: Record<string, unknown>;
}): PublicHeroMedia[] {
  const source = readHeroMediaSource(theme.heroMediaSource);
  const banners = readHeroBannerUrls(theme.heroBannerUrls, heroImageUrl).map(
    (url) => ({ altText: "", kind: "image" as const, url }),
  );
  const vehicleMedia = findVehicleHeroMedia(listings);

  if (source === "vehicles") {
    return vehicleMedia ? [vehicleMedia] : banners;
  }

  if (source === "banners") {
    return banners.length ? banners : vehicleMedia ? [vehicleMedia] : [];
  }

  return banners.length ? banners : vehicleMedia ? [vehicleMedia] : [];
}

export function resolvePublicStorefrontFeaturedListing({
  heroImageUrl,
  listings,
  theme,
}: {
  heroImageUrl: string | null;
  listings: readonly PublicVehicleListing[];
  theme: Record<string, unknown>;
}): PublicVehicleListing | null {
  const source = readHeroMediaSource(theme.heroMediaSource);
  const banners = readHeroBannerUrls(theme.heroBannerUrls, heroImageUrl);

  if (source === "banners" || (source === "auto" && banners.length > 0)) {
    return null;
  }

  return findVehicleHeroListing(listings);
}

function readHeroMediaSource(value: unknown): HeroMediaSource {
  return value === "banners" || value === "vehicles" ? value : "auto";
}

function readHeroBannerUrls(value: unknown, fallback: string | null) {
  const urls = Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && Boolean(item.trim()),
      )
    : [];
  return urls.length || !fallback ? urls : [fallback];
}

function findVehicleHeroMedia(
  listings: readonly PublicVehicleListing[],
): PublicHeroMedia | null {
  const listing = findVehicleHeroListing(listings);
  if (!listing) return null;
  if (listing.heroMedia) return toPublicHeroMedia(listing.heroMedia);
  return listing.thumbnailUrl
    ? { altText: listing.title, kind: "image", url: listing.thumbnailUrl }
    : null;
}

function findVehicleHeroListing(
  listings: readonly PublicVehicleListing[],
): PublicVehicleListing | null {
  return (
    listings.find((listing) => listing.heroMedia?.kind === "video") ??
    listings.find((listing) => listing.heroMedia?.kind === "photo") ??
    listings.find((listing) => listing.thumbnailUrl) ??
    null
  );
}

function toPublicHeroMedia(media: PublicVehicleMedia): PublicHeroMedia {
  return {
    altText: media.altText ?? "",
    kind: media.kind === "video" ? "video" : "image",
    url: media.url,
  };
}
