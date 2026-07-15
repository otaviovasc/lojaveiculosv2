import { Car, Eye, Calendar, Gauge } from "lucide-react";
import {
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
  splitVehicleTitle,
} from "./publicVehicleFormatters";
import type { PublicVehicleListing } from "./types";

export function PublicVehicleCard({
  listing,
  onOpen,
}: {
  listing: PublicVehicleListing;
  onOpen: () => void;
}) {
  const { brand, restTitle } = splitVehicleTitle(listing.title);

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-xl border border-line bg-panel shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-lg">
      <button
        aria-label={`Abrir detalhes de ${listing.title}`}
        className="w-full cursor-pointer text-left"
        onClick={onOpen}
        type="button"
      >
        {/* Image Container with 16:10 aspect ratio and zoom effect */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-app border-b border-line/60">
          <VehicleImage listing={listing} />

          {/* Status Badge */}
          <span className="absolute left-3 top-3 rounded-lg bg-panel/95 backdrop-blur-sm border border-line px-2 py-0.5 text-xs font-black uppercase tracking-wider text-accent shadow-sm">
            Disponível
          </span>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>

        {/* Content details */}
        <div className="p-5">
          {/* Title with brand emphasized */}
          <h3 className="text-lg font-extrabold leading-snug text-app-text transition-colors group-hover:text-accent">
            <span className="text-app-text">{brand}</span>
            {restTitle && (
              <>
                {" "}
                <span className="font-medium text-muted">{restTitle}</span>
              </>
            )}
          </h3>

          {listing.description && (
            <p className="mt-2 text-sm font-medium leading-relaxed text-muted line-clamp-2">
              {listing.description}
            </p>
          )}

          {/* Quick specs: Year and Mileage with compact layout */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line/40 pt-3 text-sm font-semibold text-muted">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-muted/65" />
              <span>{listing.modelYear ?? listing.manufactureYear ?? "-"}</span>
            </span>
            <span
              className="size-1 rounded-full bg-line-strong"
              aria-hidden="true"
            />
            <span className="flex items-center gap-1.5">
              <Gauge className="size-3.5 text-muted/65" />
              <span>{formatPublicVehicleMileage(listing.mileageKm)}</span>
            </span>
          </div>
        </div>
      </button>

      {/* Pricing & CTA Action Area */}
      <div className="px-5 pb-5 pt-0">
        <div className="mb-4 border-t border-line/60 pt-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-black uppercase tracking-wider text-muted/80">
              Preço sugerido
            </span>
            <p className="text-xl font-black tracking-tight text-accent mt-0.5">
              {formatPublicVehiclePrice(listing.priceCents)}
            </p>
          </div>

          <button
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-bold text-accent-foreground transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-95 cursor-pointer"
            onClick={onOpen}
            type="button"
          >
            <Eye aria-hidden="true" className="size-3.5" />
            Detalhes
          </button>
        </div>
      </div>
    </article>
  );
}

function VehicleImage({ listing }: { listing: PublicVehicleListing }) {
  if (listing.thumbnailUrl) {
    return (
      <img
        alt={listing.title}
        className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        src={listing.thumbnailUrl}
      />
    );
  }
  return (
    <div className="flex size-full items-center justify-center bg-accent-soft text-accent">
      <Car aria-hidden="true" className="size-8" />
    </div>
  );
}
