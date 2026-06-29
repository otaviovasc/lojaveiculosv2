import { RefreshCcw, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { LeadCaptureForm } from "./LeadCaptureForm";
import { HeroMedia, MediaStrip } from "./PublicListingGallery";
import {
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
} from "./publicVehicleFormatters";
import type {
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
  PublicStorefrontListingDetailData,
} from "./types";

export type PublicListingDetailSnapshot = {
  data?: PublicStorefrontListingDetailData | null;
  error?: Error | null;
  isLoading: boolean;
  listingSlug: string | null;
};

export function PublicListingDetailPanel({
  detail,
  onClose,
  onRetry,
  onSubmitInterest,
}: {
  detail: PublicListingDetailSnapshot;
  onClose: () => void;
  onRetry: () => void;
  onSubmitInterest: (
    listingSlug: string,
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
}) {
  const listing = detail.data?.listing;

  return (
    <section className="public-light-surface fixed inset-0 z-20 flex items-end bg-white/85 p-4 backdrop-blur-md md:items-center md:justify-center md:p-6">
      <article className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl border border-line bg-panel shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-line/60 px-6 py-4">
          <h3 className="text-base font-extrabold tracking-tight text-app-text uppercase">
            {listing?.title ?? "Detalhes do veículo"}
          </h3>
          <button
            aria-label="Fechar detalhes"
            className="flex size-8 items-center justify-center rounded border border-line bg-panel text-muted shadow-sm transition-all hover:bg-accent-soft hover:text-accent hover:border-accent/40 active:scale-95 cursor-pointer"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        {detail.isLoading ? (
          <DetailState
            icon={
              <RefreshCcw aria-hidden="true" className="size-5 animate-spin" />
            }
          />
        ) : null}
        {detail.error ? (
          <DetailState
            action={
              <button
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded bg-accent px-6 text-sm font-bold text-inverse shadow-sm cursor-pointer"
                onClick={onRetry}
                type="button"
              >
                <RefreshCcw aria-hidden="true" className="size-4" />
                Tentar novamente
              </button>
            }
            icon={<RefreshCcw aria-hidden="true" className="size-5" />}
          />
        ) : null}
        {detail.data ? (
          <ListingDetailContent
            detail={detail.data}
            onSubmitInterest={onSubmitInterest}
          />
        ) : null}
      </article>
    </section>
  );
}

function ListingDetailContent({
  detail,
  onSubmitInterest,
}: {
  detail: PublicStorefrontListingDetailData;
  onSubmitInterest: (
    listingSlug: string,
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
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
  const heroUrl = selectedMedia?.url ?? detail.listing.thumbnailUrl;

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
    <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="grid gap-4 bg-app p-4 md:p-6">
        <HeroMedia
          altText={selectedMedia?.altText ?? detail.listing.title}
          heroUrl={heroUrl}
          kind={selectedMedia?.kind ?? "photo"}
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
      </div>

      <div className="p-6 md:p-8 flex flex-col justify-between border-l border-line/60">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted/80">
            {detail.store.slug}.lojaveiculos.com.br
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-app-text uppercase">
            {detail.listing.title}
          </h2>

          <div className="mt-4 flex items-baseline justify-between border-b border-line/60 pb-4">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted/80">
              Preço sugerido
            </span>
            <p className="text-3xl font-black tracking-tight text-accent">
              {formatPublicVehiclePrice(detail.listing.priceCents)}
            </p>
          </div>

          {detail.listing.description ? (
            <p className="mt-5 text-xs font-semibold leading-relaxed text-muted whitespace-pre-wrap">
              {detail.listing.description}
            </p>
          ) : null}

          <div className="mt-6 grid grid-cols-3 gap-3">
            <ListingDetailMetric
              label="Ano Modelo"
              value={detail.listing.modelYear ?? "-"}
            />
            <ListingDetailMetric
              label="Quilometragem"
              value={formatPublicVehicleMileage(detail.listing.mileageKm)}
            />
            <ListingDetailMetric
              label="Fotos"
              value={`${activeMedia.length} imagens`}
            />
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-line bg-app p-5 shadow-sm md:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-app-text">
            Falar com um consultor comercial
          </p>
          <LeadCaptureForm
            listingSlug={detail.listing.slug}
            onSubmitInterest={onSubmitInterest}
          />
        </div>
      </div>
    </div>
  );
}

function UnitMediaTabs({
  groups,
  onSelect,
  selectedUnitId,
}: {
  groups: readonly {
    colorName: string | null;
    media: readonly unknown[];
    unitId: string;
  }[];
  onSelect: (unitId: string) => void;
  selectedUnitId: string | null;
}) {
  if (groups.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Variantes">
      {groups.map((group) => (
        <button
          className="rounded border border-line bg-panel px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-accent/40 data-[selected=true]:border-accent data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent cursor-pointer"
          data-selected={group.unitId === selectedUnitId ? "true" : undefined}
          key={group.unitId}
          onClick={() => onSelect(group.unitId)}
          type="button"
        >
          {group.colorName ?? "Unidade"}
        </button>
      ))}
    </div>
  );
}

function DetailState({
  action,
  icon,
}: {
  action?: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center p-6 text-center text-muted">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent border border-accent/10">
        {icon}
      </div>
      {action}
    </div>
  );
}

function ListingDetailMetric({
  label,
  value,
}: {
  label: string | number;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-line bg-app p-4 shadow-sm text-center sm:text-left">
      <span className="block text-[9px] font-black uppercase tracking-wider text-muted/80">
        {label}
      </span>
      <strong className="block text-sm font-extrabold text-app-text mt-1">
        {value}
      </strong>
    </div>
  );
}
