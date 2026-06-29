import { RefreshCcw, X } from "lucide-react";
import type { ReactNode } from "react";
import { PublicListingDetailContent } from "./PublicListingDetailContent";
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
    <section className="public-light-surface fixed inset-0 z-20 flex items-end bg-white/88 p-2 backdrop-blur-md sm:p-4 md:items-center md:justify-center md:p-6">
      <article className="max-h-[calc(100dvh-1rem)] w-full max-w-6xl overflow-auto rounded-xl border border-line bg-panel shadow-[0_24px_64px_rgba(15,23,42,0.12)] md:max-h-[92vh]">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-line/60 px-6 py-4">
          <h3 className="text-base font-extrabold tracking-tight text-app-text">
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
          <PublicListingDetailContent
            detail={detail.data}
            onSubmitInterest={onSubmitInterest}
          />
        ) : null}
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
