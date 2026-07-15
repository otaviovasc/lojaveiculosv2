import { ArrowLeft, RefreshCcw } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { PublicListingDetailContent } from "./PublicListingDetailContent";
import type {
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
  PublicStorefrontListingDetailData,
  PublicStorefrontSettingsData,
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
  settings,
}: {
  detail: PublicListingDetailSnapshot;
  onClose: () => void;
  onRetry: () => void;
  onSubmitInterest: (
    listingSlug: string,
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
  settings: PublicStorefrontSettingsData;
}) {
  const listing = detail.data?.listing;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [detail.listingSlug]);

  return (
    <section className="public-light-surface min-h-screen bg-app">
      <article className="min-h-dvh">
        <header className="sticky top-0 z-10 border-b border-line bg-panel/95 shadow-sm backdrop-blur">
          <div className="public-storefront-shell flex min-h-16 items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-accent">
                {settings.store.name}
              </p>
              <h3 className="truncate text-sm font-extrabold tracking-tight text-app-text sm:text-base">
                {listing?.title ?? "Detalhes do veículo"}
              </h3>
            </div>
            <button
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-line bg-panel px-3 text-xs font-black uppercase tracking-[0.12em] text-muted transition-all hover:border-accent/40 hover:bg-accent-soft hover:text-accent-soft-foreground active:scale-95 cursor-pointer"
              onClick={onClose}
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Voltar
            </button>
          </div>
        </header>

        <div className="public-storefront-shell px-4 sm:px-6">
          {detail.isLoading ? (
            <DetailState
              icon={
                <RefreshCcw
                  aria-hidden="true"
                  className="size-5 animate-spin"
                />
              }
            />
          ) : null}
          {detail.error ? (
            <DetailState
              action={
                <button
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-bold text-accent-foreground cursor-pointer"
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
            <PublicListingDetailContent
              detail={detail.data}
              onSubmitInterest={onSubmitInterest}
              settings={settings}
            />
          ) : null}
        </div>
      </article>
    </section>
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
