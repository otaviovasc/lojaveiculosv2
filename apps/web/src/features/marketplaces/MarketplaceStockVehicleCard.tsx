import { ExternalLink, Fuel, Gauge, Info } from "lucide-react";
import { useState } from "react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
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
import { MarketplaceVehicleModal } from "./MarketplaceVehicleModal";
import type { MarketplaceStockPlanItem } from "./types";

export function MarketplaceStockVehicleCard({
  item,
}: {
  item: MarketplaceStockPlanItem;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const action = getMarketplaceStockItemAction(item);
  const status = getMarketplaceStockItemStatus(item);
  const title = getMarketplaceStockVehicleLabel(item);
  const listing = item.listing;
  const primaryImage =
    listing.selectedMedia[0]?.url ?? listing.mediaUrls[0] ?? null;
  const price = formatMarketplaceVehiclePrice(listing.priceCents);
  const km = formatMarketplaceVehicleMileage(listing.mileageKm);
  const fuel = formatMarketplaceVehicleFuel(listing.fuelType);
  const year = listing.modelYear ? String(listing.modelYear) : null;
  const plate = listing.licensePlate;

  return (
    <>
      <li
        className="marketplace-vehicle-card"
        data-stock-status={item.accountingStatus}
      >
        <div className="marketplace-vehicle-card__media">
          <ImageWithFallback
            alt={title}
            className="marketplace-vehicle-card__img"
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

        <div className="marketplace-vehicle-card__body">
          <div className="marketplace-vehicle-card__headline">
            <div className="marketplace-vehicle-card__title-row">
              <strong className="marketplace-vehicle-card__title">
                {title}
              </strong>
              {listing.trimName ? (
                <span className="marketplace-vehicle-card__trim">
                  {listing.trimName}
                </span>
              ) : null}
              <div
                className="marketplace-vehicle-card__status-indicator"
                data-tone={status.tone}
              >
                <span
                  aria-hidden="true"
                  className="marketplace-vehicle-card__status-dot"
                />
                <span className="marketplace-vehicle-card__status-text">
                  {status.label}
                </span>
              </div>
            </div>
            <div className="marketplace-vehicle-card__specs">
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

          <p className="marketplace-vehicle-card__reason">{item.reason}</p>

          {item.blockers.length ? (
            <ul className="marketplace-stock-item__blockers">
              {item.blockers.slice(0, 2).map((blocker, index) => {
                const copy = getMarketplaceBlockerCopy(blocker);
                return (
                  <li
                    key={`${listing.listingId}-${blocker.code}-${blocker.field ?? "none"}-${index}`}
                  >
                    <span className="marketplace-stock-item__layer">
                      {getMarketplaceBlockerLayerLabel(
                        blocker.layer,
                        item.provider,
                      )}
                    </span>
                    <span>
                      <strong>{copy.message}</strong> Próximo passo:{" "}
                      {copy.action}
                    </span>
                  </li>
                );
              })}
              {item.blockers.length > 2 ? (
                <li className="marketplace-stock-item__more-blockers">
                  <button
                    className="marketplace-stock-item__more-btn"
                    onClick={() => setIsModalOpen(true)}
                    type="button"
                  >
                    +{item.blockers.length - 2} pendências adicionais no
                    diagnóstico
                  </button>
                </li>
              ) : null}
            </ul>
          ) : item.userAction ? (
            <p className="marketplace-stock-item__next-step">
              Próximo passo: {item.userAction}
            </p>
          ) : null}
        </div>

        <div className="marketplace-vehicle-card__aside">
          {action ? (
            <FeatureActionButton
              icon={action.icon}
              label={`${action.label}: ${title}`}
              onClick={() => {
                window.location.hash = action.hash;
              }}
            >
              {action.label}
            </FeatureActionButton>
          ) : null}
          <div className="marketplace-vehicle-card__links">
            <button
              className="marketplace-vehicle-card__diag-btn"
              onClick={() => setIsModalOpen(true)}
              type="button"
            >
              <Info aria-hidden="true" className="size-3.5" />
              <span>Ver diagnóstico</span>
            </button>
            <a
              className="marketplace-vehicle-card__inventory-link"
              href={`#/inventory?listing=${encodeURIComponent(listing.listingId)}`}
              title="Abrir veículo no inventário"
            >
              <ExternalLink aria-hidden="true" className="size-3.5" />
              <span>Inventário</span>
            </a>
          </div>
        </div>
      </li>

      <MarketplaceVehicleModal
        isOpen={isModalOpen}
        item={item}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
