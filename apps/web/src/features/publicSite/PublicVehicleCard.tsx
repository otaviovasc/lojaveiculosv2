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
    <article className="overflow-hidden rounded-lg border border-line bg-panel">
      <VehicleImage listing={listing} />
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-lg font-black">{listing.title}</h3>
          <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-black text-accent">
            Disponivel
          </span>
        </div>
        <p className="text-2xl font-black text-accent">
          {formatPrice(listing.priceCents)}
        </p>
        <p className="mt-3 min-h-10 text-sm font-semibold text-muted">
          {listing.description}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-black text-muted">
          <PublicVehicleMetric label="Ano" value={listing.modelYear ?? "-"} />
          <PublicVehicleMetric
            label="Km"
            value={formatMileage(listing.mileageKm)}
          />
          <PublicVehicleMetric label="Cod." value={listing.slug.slice(0, 8)} />
        </div>
        <button
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 font-black text-inverse"
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
        className="aspect-[16/9] w-full bg-app object-cover"
        src={listing.thumbnailUrl}
      />
    );
  }
  return (
    <div className="flex aspect-[16/9] items-center justify-center bg-accent-soft text-accent">
      <Car aria-hidden="true" className="size-12" />
    </div>
  );
}

function PublicVehicleMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md bg-app p-2">
      <span className="block">{label}</span>
      <strong className="block text-app-text">{value}</strong>
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
