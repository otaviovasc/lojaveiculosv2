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
    <article className="group overflow-hidden rounded-[1.35rem] border border-line bg-panel shadow-[0_10px_34px_rgb(15_23_42_/_0.06)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_24px_70px_rgb(15_23_42_/_0.12)]">
      <VehicleImage listing={listing} />
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold leading-tight tracking-tight">
            {listing.title}
          </h3>
          <span className="rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold text-accent-strong">
            Disponivel
          </span>
        </div>
        <p className="text-2xl font-semibold tracking-tight text-accent">
          {formatPrice(listing.priceCents)}
        </p>
        <p className="mt-3 min-h-10 text-sm font-medium leading-6 text-muted">
          {listing.description}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-muted">
          <span>{listing.modelYear ?? "-"}</span>
          <span aria-hidden="true" className="text-line-strong">
            •
          </span>
          <span>{formatMileage(listing.mileageKm)}</span>
          <span aria-hidden="true" className="text-line-strong">
            •
          </span>
          <span>{listing.slug.slice(0, 8)}</span>
        </div>
        <button
          className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-inverse shadow-[0_14px_34px_color-mix(in_oklab,var(--color-accent)_22%,transparent)] transition-[box-shadow,filter,transform] duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98]"
          onClick={onOpen}
          type="button"
        >
          <Eye aria-hidden="true" className="size-4" />
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
        className="aspect-[16/10] w-full bg-app object-cover transition-transform duration-700 group-hover:scale-105"
        src={listing.thumbnailUrl}
      />
    );
  }
  return (
    <div className="flex aspect-[16/10] items-center justify-center bg-accent-soft text-accent">
      <Car aria-hidden="true" className="size-12" />
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
