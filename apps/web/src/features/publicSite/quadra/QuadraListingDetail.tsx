import { ArrowLeft, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, type ReactNode } from "react";
import "./quadra-detail.css";
import type { PublicListingDetailSnapshot } from "../PublicListingDetailPanel";
import type {
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
  PublicStorefrontSettingsData,
  PublicVehicleListing,
} from "../types";
import { adaptQuadraStorefront } from "./quadraAdapter";
import { QuadraListingDetailContent } from "./QuadraListingDetailContent";
import { quadraDetailLeadFormVisible } from "./QuadraListingDetailModel";

export function QuadraListingDetail({
  availableListings,
  detail,
  onClose,
  onOpenListing,
  onRetry,
  onSubmitInterest,
  settings,
}: {
  availableListings: readonly PublicVehicleListing[];
  detail: PublicListingDetailSnapshot;
  onClose: () => void;
  onOpenListing: (listingSlug: string) => void;
  onRetry: () => void;
  onSubmitInterest: (
    listingSlug: string,
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
  settings: PublicStorefrontSettingsData;
}) {
  const model = useMemo(
    () =>
      detail.data
        ? adaptQuadraStorefront({
            listings: [detail.data.listing],
            settings,
            store: detail.data.store,
          })
        : null,
    [detail.data, settings],
  );

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [detail.listingSlug]);

  return (
    <section className="quadra-detail" data-quadra-detail="true">
      <header className="quadra-detail-header">
        <div className="quadra-container quadra-detail-header__inner">
          <button
            className="quadra-detail-header__back"
            onClick={onClose}
            type="button"
          >
            <ArrowLeft aria-hidden="true" />
            Voltar
          </button>
          <div className="quadra-detail-header__store">
            {model?.logoUrl ? (
              <img alt={`Logo ${model.storeName}`} src={model.logoUrl} />
            ) : null}
            <span>{model?.storeName ?? settings.store.name}</span>
          </div>
        </div>
      </header>

      <article className="quadra-container quadra-detail__content">
        {detail.isLoading ? (
          <QuadraDetailState
            icon={<RefreshCcw aria-hidden="true" className="quadra-spin" />}
            message="Carregando veículo..."
          />
        ) : null}
        {detail.error ? (
          <QuadraDetailState
            action={
              <button onClick={onRetry} type="button">
                <RefreshCcw aria-hidden="true" />
                Tentar novamente
              </button>
            }
            icon={<RefreshCcw aria-hidden="true" />}
            message="Não foi possível carregar este veículo."
          />
        ) : null}
        {detail.data && model ? (
          <QuadraListingDetailContent
            availableListings={availableListings}
            detail={detail.data}
            key={detail.data.listing.slug}
            model={model}
            onOpenListing={onOpenListing}
            onSubmitInterest={onSubmitInterest}
            showLeadForm={quadraDetailLeadFormVisible(settings.site.theme)}
          />
        ) : null}
      </article>
    </section>
  );
}

function QuadraDetailState({
  action,
  icon,
  message,
}: {
  action?: ReactNode;
  icon: ReactNode;
  message: string;
}) {
  return (
    <div className="quadra-detail-state">
      {icon}
      <p>{message}</p>
      {action}
    </div>
  );
}
