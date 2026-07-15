import { useEffect, useMemo, useState } from "react";
import { MediaStrip, VehicleMediaShowcase } from "./PublicListingGallery";
import {
  UnitMediaTabs,
  VehicleDetailHeader,
  VehicleLeadCard,
  VehicleListingVideo,
  VehicleStory,
} from "./PublicListingDetailSections";
import type {
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
  PublicStorefrontListingDetailData,
  PublicStorefrontSettingsData,
} from "./types";

export function PublicListingDetailContent({
  detail,
  onSubmitInterest,
  settings,
}: {
  detail: PublicStorefrontListingDetailData;
  onSubmitInterest: (
    listingSlug: string,
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
  settings: PublicStorefrontSettingsData;
}) {
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const mediaGroups = useMemo(
    () => detail.listing.mediaGroups.filter((group) => group.media.length > 0),
    [detail.listing.mediaGroups],
  );
  const activeGroup =
    mediaGroups.find((group) => group.unitId === selectedUnitId) ??
    mediaGroups[0] ??
    null;
  const activeMedia = activeGroup?.media.length
    ? activeGroup.media
    : detail.listing.media;
  const selectedMedia =
    activeMedia.find((item) => item.url === selectedMediaUrl) ??
    activeMedia[0] ??
    null;
  const colorNames = Array.from(
    new Set(
      detail.listing.mediaGroups
        .map((group) => group.colorName)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  useEffect(() => {
    const firstGroup = mediaGroups[0] ?? null;
    setSelectedUnitId(firstGroup?.unitId ?? null);
    setSelectedMediaUrl(
      firstGroup?.media[0]?.url ?? detail.listing.media[0]?.url ?? null,
    );
  }, [detail.listing.slug, detail.listing.media, mediaGroups]);

  const handleGroupSelect = (unitId: string) => {
    const nextGroup = mediaGroups.find((group) => group.unitId === unitId);
    setSelectedUnitId(unitId);
    setSelectedMediaUrl(nextGroup?.media[0]?.url ?? null);
  };

  return (
    <div className="grid gap-8 py-6">
      <VehicleDetailHeader
        colorNames={colorNames}
        detail={detail}
        mediaCount={activeMedia.length}
      />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.38fr)_minmax(340px,0.62fr)] lg:items-start">
        <div className="grid gap-4">
          <VehicleMediaShowcase
            altText={selectedMedia?.altText ?? detail.listing.title}
            media={activeMedia}
            onSelect={setSelectedMediaUrl}
            selectedMedia={selectedMedia}
          />
          <UnitMediaTabs
            groups={mediaGroups}
            onSelect={handleGroupSelect}
            selectedUnitId={activeGroup?.unitId ?? null}
          />
          <MediaStrip
            media={activeMedia}
            onSelect={setSelectedMediaUrl}
            selectedUrl={selectedMedia?.url ?? null}
          />
          <VehicleListingVideo
            title={detail.listing.title}
            videoUrl={detail.listing.videoUrl}
          />
          <div className="hidden lg:block">
            <VehicleStory colorNames={colorNames} detail={detail} />
          </div>
        </div>

        <VehicleLeadCard
          colorNames={colorNames}
          detail={detail}
          mediaCount={activeMedia.length}
          onSubmitInterest={onSubmitInterest}
          settings={settings}
        />
      </section>

      <div className="lg:hidden">
        <VehicleStory colorNames={colorNames} detail={detail} />
      </div>
    </div>
  );
}
