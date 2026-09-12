import { ExternalLink, Fuel, Gauge, ShieldAlert } from "lucide-react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { ImageWithFallback } from "../../components/ui/ImageWithFallback";
import { MercosulPlateBadge } from "../inventory/components/InventoryListingBadges";
import { getMarketplaceBlockerCopy } from "./marketplaceLabels";
import {
  formatMarketplaceVehicleFuel,
  formatMarketplaceVehicleMileage,
  formatMarketplaceVehiclePrice,
  getMarketplaceBlockerLayerLabel,
  getMarketplaceStockItemAction,
  getMarketplaceStockItemStatus,
  getMarketplaceStockVehicleLabel,
} from "./marketplaceStockVehicleHelpers";
import type { MarketplaceStockPlanItem } from "./types";

export function MarketplaceVehicleModal({
  isOpen,
  item,
  onClose,
}: {
  isOpen: boolean;
  item: MarketplaceStockPlanItem | null;
  onClose: () => void;
}) {
  if (!item) return null;

  const title = getMarketplaceStockVehicleLabel(item);
  const listing = item.listing;
  const primaryImage =
    listing.selectedMedia[0]?.url ?? listing.mediaUrls[0] ?? null;
  const price = formatMarketplaceVehiclePrice(listing.priceCents);
  const km = formatMarketplaceVehicleMileage(listing.mileageKm);
  const fuel = formatMarketplaceVehicleFuel(listing.fuelType);
  const year = listing.modelYear ? String(listing.modelYear) : null;
  const plate = listing.licensePlate;
  const status = getMarketplaceStockItemStatus(item);
  const action = getMarketplaceStockItemAction(item);

  return (
    <FeatureDialog
      className="marketplace-modal-dialog"
      isOpen={isOpen}
      onClose={onClose}
      title={`${title} · Diagnóstico do veículo`}
    >
      <div className="marketplace-modal-content">
        <div className="marketplace-modal-vehicle-header">
          <div className="marketplace-modal-vehicle-media">
            <ImageWithFallback
              alt={title}
              className="marketplace-modal-vehicle-img"
              fallback={
                <div className="marketplace-vehicle-card__no-photo">
                  <span className="marketplace-vehicle-card__no-photo-badge">
                    Sem foto
                  </span>
                  <span>Fotos em breve</span>
                </div>
              }
              src={primaryImage}
            />
          </div>
          <div className="marketplace-modal-vehicle-info">
            <div className="marketplace-modal-vehicle-title-row">
              <h4>{title}</h4>
              <FeatureStatusBadge size="dense" tone={status.tone}>
                {status.label}
              </FeatureStatusBadge>
            </div>
            {listing.trimName ? (
              <p className="marketplace-modal-vehicle-trim">
                {listing.trimName}
              </p>
            ) : null}
            <div className="marketplace-modal-vehicle-chips">
              {plate && plate !== "-" ? (
                <MercosulPlateBadge plate={plate} />
              ) : null}
              {price ? (
                <span className="marketplace-vehicle-card__price">{price}</span>
              ) : null}
              {year ? (
                <span className="marketplace-vehicle-card__chip">{year}</span>
              ) : null}
              {km ? (
                <span className="marketplace-vehicle-card__chip">
                  <Gauge aria-hidden="true" className="size-3" />
                  <span>{km}</span>
                </span>
              ) : null}
              {fuel ? (
                <span className="marketplace-vehicle-card__chip">
                  <Fuel aria-hidden="true" className="size-3" />
                  <span>{fuel}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="marketplace-modal-section">
          <div className="marketplace-modal-section__title">
            <ShieldAlert aria-hidden="true" className="size-4 text-accent" />
            <span>Situação para envio</span>
          </div>
          <p className="marketplace-modal-description">{item.reason}</p>

          {item.blockers.length ? (
            <ul className="marketplace-modal-blockers">
              {item.blockers.map((blocker, index) => {
                const copy = getMarketplaceBlockerCopy(blocker);
                return (
                  <li key={`${listing.listingId}-${blocker.code}-${index}`}>
                    <span className="marketplace-stock-item__layer">
                      {getMarketplaceBlockerLayerLabel(
                        blocker.layer,
                        item.provider,
                      )}
                    </span>
                    <div>
                      <strong>{copy.message}</strong>
                      <p>Próximo passo: {copy.action}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : item.userAction ? (
            <p className="marketplace-modal-next-step">
              Próximo passo: {item.userAction}
            </p>
          ) : (
            <p className="marketplace-modal-empty text-success-strong">
              Nenhum bloqueio técnico impede o envio deste anúncio.
            </p>
          )}
        </div>

        <div className="marketplace-modal-actions">
          {action ? (
            <FeatureActionButton
              icon={action.icon}
              label={action.label}
              onClick={() => {
                window.location.hash = action.hash;
                onClose();
              }}
              variant="primary"
            >
              {action.label}
            </FeatureActionButton>
          ) : null}
          <a
            className="marketplace-modal-secondary-link"
            href={`#/inventory?listing=${encodeURIComponent(listing.listingId)}`}
            onClick={onClose}
          >
            <ExternalLink aria-hidden="true" className="size-3.5" />
            <span>Abrir no inventário</span>
          </a>
        </div>
      </div>
    </FeatureDialog>
  );
}
