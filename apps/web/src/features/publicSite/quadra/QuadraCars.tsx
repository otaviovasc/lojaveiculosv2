import { DEFAULT_STOREFRONT_VEHICLE_IMAGE } from "@lojaveiculosv2/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type MouseEvent, useState } from "react";
import {
  formatPublicVehicleFuel,
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
  splitVehicleTitle,
} from "../publicVehicleFormatters";
import type { PublicVehicleListing } from "../types";
import { quadraListingMedia } from "./quadraAdapter";

type QuadraCarsProps = {
  listings: readonly PublicVehicleListing[];
  onOpenListing: (listingSlug: string) => void;
};

export function QuadraCars({ listings, onOpenListing }: QuadraCarsProps) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <section className="quadra-cars" id="cars">
      <div className="quadra-container">
        <motion.header
          className="quadra-cars__heading"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
          transition={{ duration: 0.55, ease: [0.21, 1, 0.36, 1] }}
          viewport={{ amount: 0.4, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <div>
            <div className="quadra-modern-divider" />
            <span>Veículos disponíveis</span>
            <h2>
              Nosso <strong className="quadra-accent-text">estoque</strong>
            </h2>
          </div>
          <p>{listings.length} veículos disponíveis</p>
        </motion.header>
        {listings.length ? (
          <motion.div
            className="quadra-cars__grid"
            initial={prefersReducedMotion ? false : "hidden"}
            variants={{
              hidden: {},
              show: {
                transition: { delayChildren: 0.1, staggerChildren: 0.08 },
              },
            }}
            viewport={{ amount: 0.1, once: true }}
            whileInView="show"
          >
            {listings.map((listing) => (
              <motion.div
                key={listing.slug}
                variants={{
                  hidden: { opacity: 0, y: 32 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.55, ease: [0.21, 1, 0.36, 1] },
                  },
                }}
              >
                <QuadraVehicleCard
                  listing={listing}
                  onOpen={() => onOpenListing(listing.slug)}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="quadra-cars__empty">
            <p>Nenhum veículo encontrado.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function QuadraVehicleCard({
  listing,
  onOpen,
}: {
  listing: PublicVehicleListing;
  onOpen: () => void;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const media = quadraListingMedia(listing);
  const title = splitVehicleTitle(listing.title);
  const selectedMedia = media[photoIndex] ?? null;

  const navigatePhoto = (event: MouseEvent, offset: number) => {
    event.stopPropagation();
    setPhotoIndex(
      (current) => (current + offset + media.length) % media.length,
    );
  };

  return (
    <article className="quadra-car-card">
      <div className="quadra-car-card__media">
        <img
          alt={selectedMedia?.altText ?? `${listing.title}: foto em preparação`}
          decoding="async"
          loading="lazy"
          src={selectedMedia?.url ?? DEFAULT_STOREFRONT_VEHICLE_IMAGE}
        />
        <div className="quadra-car-card__overlay" />

        {listing.commercialTags[0] ? (
          <span className="quadra-car-card__badge">
            {listing.commercialTags[0]}
          </span>
        ) : null}

        {listing.fuelType ? (
          <span className="quadra-car-card__fuel">
            {formatPublicVehicleFuel(listing.fuelType)}
          </span>
        ) : null}

        {media.length > 1 ? (
          <>
            <button
              aria-label={`Foto anterior de ${listing.title}`}
              className="quadra-car-card__arrow quadra-car-card__arrow--prev"
              onClick={(event) => navigatePhoto(event, -1)}
              type="button"
            >
              <ChevronLeft />
            </button>
            <button
              aria-label={`Próxima foto de ${listing.title}`}
              className="quadra-car-card__arrow quadra-car-card__arrow--next"
              onClick={(event) => navigatePhoto(event, 1)}
              type="button"
            >
              <ChevronRight />
            </button>
            <div className="quadra-car-card__dots" aria-hidden="true">
              {media.map((item, index) => (
                <span
                  className={index === photoIndex ? "is-active" : ""}
                  key={`${item.url}-${index}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="quadra-car-card__content">
        <h3>
          {title.brand}
          {title.restTitle ? (
            <span className="quadra-accent-text"> {title.restTitle}</span>
          ) : null}
        </h3>
        {listing.trimName ? <p>{listing.trimName}</p> : null}

        <div className="quadra-car-card__price">
          {formatPublicVehiclePrice(listing.priceCents)}
        </div>

        <div className="quadra-car-card__details">
          <span>
            {listing.manufactureYear ?? "-"}/{listing.modelYear ?? "-"}
          </span>
          <span>{formatPublicVehicleMileage(listing.mileageKm)}</span>
          <span>DISPONÍVEL</span>
        </div>

        <button
          aria-label={`Abrir detalhes de ${listing.title}`}
          className="quadra-car-card__hint"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          type="button"
        >
          + Detalhes
        </button>
      </div>
    </article>
  );
}
