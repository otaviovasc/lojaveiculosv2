import { Share2 } from "lucide-react";
import { useState } from "react";
import {
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
} from "../publicVehicleFormatters";
import { yearLabel } from "../PublicListingDetailParts";
import type { PublicVehicleListing } from "../types";

export function QuadraDetailShare({
  price,
  title,
}: {
  price: string;
  title: string;
}) {
  const [feedback, setFeedback] = useState<
    "copied" | "error" | "shared" | null
  >(null);

  async function share() {
    const url = window.location.href;
    const text = `Confira este veículo: ${title} - ${price}`;
    try {
      if (navigator.share) {
        await navigator.share({ text, title, url });
        setFeedback("shared");
        return;
      }
      if (!navigator.clipboard?.writeText) throw new Error("clipboard missing");
      await navigator.clipboard.writeText(url);
      setFeedback("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeedback("error");
    }
  }

  return (
    <div className="quadra-detail-share">
      <button onClick={() => void share()} type="button">
        <Share2 aria-hidden="true" />
        Compartilhar esse Veículo
      </button>
      {feedback ? (
        <p role={feedback === "error" ? "alert" : "status"}>
          {shareFeedback(feedback)}
        </p>
      ) : null}
    </div>
  );
}

export function QuadraRelatedVehicles({
  listings,
  onOpenListing,
}: {
  listings: readonly PublicVehicleListing[];
  onOpenListing: (listingSlug: string) => void;
}) {
  if (listings.length === 0) return null;

  return (
    <section className="quadra-detail-related">
      <h2>Veículos Similares</h2>
      <div className="quadra-detail-related__grid">
        {listings.map((listing) => {
          const imageUrl =
            listing.media.find((media) => media.kind === "photo")?.url ??
            listing.thumbnailUrl;
          return (
            <button
              aria-label={`Abrir detalhes de ${listing.title}`}
              className="quadra-detail-related__card"
              key={listing.slug}
              onClick={() => onOpenListing(listing.slug)}
              type="button"
            >
              <div className="quadra-detail-related__image">
                {imageUrl ? (
                  <img alt={listing.title} loading="lazy" src={imageUrl} />
                ) : (
                  <span>Sem foto</span>
                )}
              </div>
              <div className="quadra-detail-related__body">
                <h3>{listing.title}</h3>
                {listing.trimName ? <p>{listing.trimName}</p> : null}
                <div>
                  <span>
                    {yearLabel(listing.manufactureYear, listing.modelYear)}
                  </span>
                  <span>{formatPublicVehicleMileage(listing.mileageKm)}</span>
                </div>
                <strong>{formatPublicVehiclePrice(listing.priceCents)}</strong>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function shareFeedback(feedback: "copied" | "error" | "shared") {
  if (feedback === "copied")
    return "Link copiado para a área de transferência!";
  if (feedback === "shared") return "Veículo compartilhado!";
  return "Não foi possível compartilhar o veículo.";
}
