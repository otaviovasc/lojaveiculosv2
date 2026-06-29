import { RefreshCcw, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { LeadCaptureForm } from "./LeadCaptureForm";
import { HeroMedia, MediaStrip } from "./PublicListingGallery";
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
    <section className="public-light-surface fixed inset-0 z-20 flex items-end bg-white/82 p-3 backdrop-blur-md md:items-center md:justify-center md:p-6">
      <article className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[1.5rem] border border-line bg-panel shadow-[0_30px_100px_rgb(15_23_42_/_0.18)]">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-line px-5">
          <h3 className="text-lg font-semibold tracking-tight">
            {listing?.title ?? "Detalhes do veiculo"}
          </h3>
          <button
            aria-label="Fechar detalhes"
            className="flex size-10 items-center justify-center rounded-full bg-app text-app-text transition-colors hover:bg-accent-soft hover:text-accent"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
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
                className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-inverse"
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
    <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-3 bg-app p-4 md:p-5">
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

      <div className="p-5 md:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
          {detail.store.slug}.lojaveiculos.com.br
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          {detail.listing.title}
        </h2>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-accent">
          {formatPrice(detail.listing.priceCents)}
        </p>
        <p className="mt-4 text-sm font-medium leading-6 text-muted">
          {detail.listing.description}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-muted">
          <ListingDetailMetric
            label="Ano"
            value={detail.listing.modelYear ?? "-"}
          />
          <ListingDetailMetric
            label="Km"
            value={formatMileage(detail.listing.mileageKm)}
          />
          <ListingDetailMetric label="Fotos" value={activeMedia.length} />
        </div>
        <LeadCaptureForm
          listingSlug={detail.listing.slug}
          onSubmitInterest={onSubmitInterest}
        />
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
          className="rounded-full border border-line bg-panel px-3 py-2 text-xs font-semibold text-app-text transition-colors hover:border-accent/40 data-[selected=true]:border-accent data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
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
      <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
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
    <div className="rounded-2xl bg-app p-3">
      <span className="block">{label}</span>
      <strong className="block text-app-text">{value}</strong>
    </div>
  );
}

function formatPrice(priceCents: number | null) {
  if (priceCents === null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(priceCents / 100);
}

function formatMileage(mileageKm: number | null) {
  if (mileageKm === null) return "-";
  return `${new Intl.NumberFormat("pt-BR").format(mileageKm)} km`;
}
