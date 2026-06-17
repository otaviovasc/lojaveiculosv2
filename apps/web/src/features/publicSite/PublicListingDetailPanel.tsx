import { ImageIcon, RefreshCcw, X } from "lucide-react";
import type { ReactNode } from "react";
import type { PublicStorefrontListingDetailData } from "./types";

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
}: {
  detail: PublicListingDetailSnapshot;
  onClose: () => void;
  onRetry: () => void;
}) {
  const listing = detail.data?.listing;

  return (
    <section className="fixed inset-0 z-20 flex items-end bg-app/80 p-3 backdrop-blur-sm md:items-center md:justify-center md:p-6">
      <article className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-lg border border-line bg-panel">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-line px-4">
          <h3 className="text-lg font-black">
            {listing?.title ?? "Detalhes do veiculo"}
          </h3>
          <button
            aria-label="Fechar detalhes"
            className="flex size-10 items-center justify-center rounded-lg bg-app text-app-text"
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
                className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 font-black text-inverse"
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
        {detail.data ? <ListingDetailContent detail={detail.data} /> : null}
      </article>
    </section>
  );
}

function ListingDetailContent({
  detail,
}: {
  detail: PublicStorefrontListingDetailData;
}) {
  const [heroMedia] = detail.listing.media;
  const heroUrl = heroMedia?.url ?? detail.listing.thumbnailUrl;

  return (
    <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="bg-app p-4">
        {heroUrl ? (
          <img
            alt={heroMedia?.altText ?? detail.listing.title}
            className="aspect-[16/10] w-full rounded-lg object-cover"
            src={heroUrl}
          />
        ) : (
          <div className="flex aspect-[16/10] items-center justify-center rounded-lg bg-accent-soft text-accent">
            <ImageIcon aria-hidden="true" className="size-14" />
          </div>
        )}
      </div>

      <div className="p-5">
        <p className="text-xs font-black uppercase tracking-widest text-muted">
          {detail.store.slug}.lojaveiculos.com.br
        </p>
        <h2 className="mt-2 text-2xl font-black">{detail.listing.title}</h2>
        <p className="mt-3 text-3xl font-black text-accent">
          {formatPrice(detail.listing.priceCents)}
        </p>
        <p className="mt-4 text-sm font-semibold text-muted">
          {detail.listing.description}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-black text-muted">
          <Metric label="Ano" value={detail.listing.modelYear ?? "-"} />
          <Metric label="Km" value={formatMileage(detail.listing.mileageKm)} />
          <Metric label="Fotos" value={detail.listing.media.length} />
        </div>
      </div>
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
      <div className="flex size-12 items-center justify-center rounded-lg bg-accent-soft text-accent">
        {icon}
      </div>
      {action}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-app p-2">
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
