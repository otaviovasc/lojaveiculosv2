import { Car, Eye } from "lucide-react";
import type { PublicVehicleListing } from "./types";

export function PublicVehicleCard({
  listing,
  onOpen,
}: {
  listing: PublicVehicleListing;
  onOpen: () => void;
}) {
  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-[2rem] border border-line bg-panel shadow-[0_12px_30px_-10px_rgba(15,23,42,0.03)] transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/30 hover:shadow-[0_20px_40px_-5px_rgba(15,23,42,0.08)]">
      <div>
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-app">
          <VehicleImage listing={listing} />
          <span className="absolute left-4 top-4 rounded-full bg-panel/90 backdrop-blur-md border border-line px-3 py-1 text-[10px] font-black uppercase tracking-wider text-accent">
            Disponível
          </span>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-bold leading-snug tracking-tight text-app-text transition-colors group-hover:text-accent">
            {listing.title}
          </h3>

          <p className="mt-3 text-sm font-medium leading-relaxed text-muted line-clamp-2">
            {listing.description}
          </p>

          <div className="mt-4 flex items-center gap-2.5 text-xs font-bold text-muted">
            <span>{listing.modelYear ?? "-"}</span>
            <span
              className="size-1 rounded-full bg-line-strong"
              aria-hidden="true"
            />
            <span>{formatMileage(listing.mileageKm)}</span>
            <span
              className="size-1 rounded-full bg-line-strong"
              aria-hidden="true"
            />
            <span className="uppercase opacity-80">
              {listing.slug.slice(0, 8)}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 pt-0">
        <div className="mb-4 border-t border-line/60 pt-4 flex items-baseline justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted">
            Preço sugerido
          </span>
          <p className="text-xl font-extrabold tracking-tight text-accent">
            {formatPrice(listing.priceCents)}
          </p>
        </div>

        <button
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-4 text-xs font-bold text-inverse shadow-[0_6px_20px_color-mix(in_oklab,var(--color-accent)_16%,transparent)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_color-mix(in_oklab,var(--color-accent)_26%,transparent)] hover:brightness-105 active:translate-y-0 active:scale-95"
          onClick={onOpen}
          type="button"
        >
          <Eye aria-hidden="true" className="size-3.5" />
          Ver detalhes
        </button>
      </div>
    </article>
  );
}

function VehicleImage({ listing }: { listing: PublicVehicleListing }) {
  if (listing.thumbnailUrl) {
    return (
      <img
        alt={listing.title}
        className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        src={listing.thumbnailUrl}
      />
    );
  }
  return (
    <div className="flex size-full items-center justify-center bg-accent-soft text-accent">
      <Car aria-hidden="true" className="size-10" />
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
