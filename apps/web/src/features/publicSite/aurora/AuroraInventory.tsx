import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Gauge,
  ImageIcon,
} from "lucide-react";
import { type MouseEvent, useState } from "react";
import {
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
  splitVehicleTitle,
} from "../publicVehicleFormatters";
import { quadraListingMedia } from "../quadra/quadraAdapter";
import type { PublicVehicleListing } from "../types";

export function AuroraInventory({
  listings,
  onOpenListing,
  query,
}: {
  listings: readonly PublicVehicleListing[];
  onOpenListing: (listingSlug: string) => void;
  query: string;
}) {
  return (
    <section className="aurora-inventory" id="estoque">
      <div className="aurora-shell">
        <header className="aurora-section-heading">
          <div>
            <p className="aurora-eyebrow">Disponíveis agora</p>
            <h2>Escolha sem sair da vitrine.</h2>
          </div>
          <p>
            {query
              ? `${listings.length} resultado${listings.length === 1 ? "" : "s"} para “${query}”`
              : `Mostrando ${listings.length} veículo${listings.length === 1 ? "" : "s"}`}
          </p>
        </header>

        {listings.length ? (
          <div className="aurora-inventory__grid">
            {listings.map((listing, index) => (
              <AuroraVehicleCard
                featured={index === 0}
                key={listing.slug}
                listing={listing}
                onOpen={() => onOpenListing(listing.slug)}
              />
            ))}
          </div>
        ) : (
          <div className="aurora-inventory__empty">
            <ImageIcon aria-hidden="true" />
            <h3>Nenhum veículo encontrado</h3>
            <p>Tente buscar por outro modelo, marca ou versão.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function AuroraVehicleCard({
  featured,
  listing,
  onOpen,
}: {
  featured: boolean;
  listing: PublicVehicleListing;
  onOpen: () => void;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const media = quadraListingMedia(listing);
  const selected = media[photoIndex] ?? null;
  const title = splitVehicleTitle(listing.title);

  const move = (event: MouseEvent, offset: number) => {
    event.stopPropagation();
    setPhotoIndex(
      (current) => (current + offset + media.length) % media.length,
    );
  };

  return (
    <article className={`aurora-vehicle-card ${featured ? "is-featured" : ""}`}>
      <div className="aurora-vehicle-card__media">
        {selected ? (
          <img
            alt={selected.altText ?? listing.title}
            decoding="async"
            loading={featured ? "eager" : "lazy"}
            src={selected.url}
          />
        ) : (
          <div className="aurora-vehicle-card__placeholder">
            <ImageIcon aria-hidden="true" />
            <span>Imagem em breve</span>
          </div>
        )}
        <div className="aurora-vehicle-card__badges">
          {listing.commercialTags.slice(0, 2).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        {media.length > 1 ? (
          <div className="aurora-vehicle-card__media-controls">
            <button
              aria-label={`Foto anterior de ${listing.title}`}
              onClick={(event) => move(event, -1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <span aria-live="polite">
              {photoIndex + 1} / {media.length}
            </span>
            <button
              aria-label={`Próxima foto de ${listing.title}`}
              onClick={(event) => move(event, 1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="aurora-vehicle-card__body">
        <div className="aurora-vehicle-card__title-row">
          <div>
            <p>{title.brand}</p>
            <h3>{title.restTitle || listing.title}</h3>
          </div>
          <span className="aurora-vehicle-card__availability">Disponível</span>
        </div>
        {listing.trimName ? (
          <p className="aurora-vehicle-card__trim">{listing.trimName}</p>
        ) : null}
        <div className="aurora-vehicle-card__specs">
          <span>
            {listing.manufactureYear ?? "—"}/{listing.modelYear ?? "—"}
          </span>
          <span>
            <Gauge aria-hidden="true" />{" "}
            {formatPublicVehicleMileage(listing.mileageKm)}
          </span>
          {listing.transmission ? <span>{listing.transmission}</span> : null}
        </div>
        <div className="aurora-vehicle-card__footer">
          <strong>{formatPublicVehiclePrice(listing.priceCents)}</strong>
          <button
            aria-label={`Abrir detalhes de ${listing.title}`}
            onClick={onOpen}
            type="button"
          >
            Ver detalhes <ArrowUpRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
