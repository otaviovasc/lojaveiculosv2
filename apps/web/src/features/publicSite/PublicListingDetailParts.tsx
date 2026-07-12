import {
  BadgeCheck,
  Calendar,
  CarFront,
  Fuel,
  Gauge,
  MapPin,
  Settings2,
  ShieldCheck,
  SwatchBook,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  formatPublicVehicleEngine,
  formatPublicVehicleFuel,
  formatPublicVehicleMileage,
  formatPublicVehicleTransmission,
} from "./publicVehicleFormatters";
import type {
  PublicStorefrontListingDetailData,
  PublicStorefrontSettingsData,
} from "./types";

export function DetailBadge({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-lg bg-accent-soft px-3 text-xs font-black uppercase tracking-[0.16em] text-accent-soft-foreground">
      {icon}
      {children}
    </span>
  );
}

export function AvailableBadge() {
  return (
    <DetailBadge icon={<BadgeCheck className="size-3.5" />}>
      Disponível
    </DetailBadge>
  );
}

export function VehicleMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-line bg-panel p-3">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-xs font-black uppercase tracking-wider">
          {label}
        </span>
      </div>
      <strong className="mt-1 block truncate text-sm font-extrabold text-app-text">
        {value}
      </strong>
    </div>
  );
}

export function ColorSummary({
  colorNames,
}: {
  colorNames: readonly string[];
}) {
  return (
    <div className="rounded-xl border border-line bg-app p-4">
      <span className="text-xs font-black uppercase tracking-wider text-muted/80">
        Cores disponíveis
      </span>
      <div className="mt-3 flex flex-wrap gap-2">
        {colorNames.map((colorName) => (
          <span
            className="rounded-lg border border-line bg-panel px-2.5 py-1 text-xs font-black text-app-text"
            key={colorName}
          >
            {colorName}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TrustNotes({
  settings,
}: {
  settings: PublicStorefrontSettingsData;
}) {
  const location = settings.contact.city;

  return (
    <div className="rounded-xl border border-accent/15 bg-accent-soft/45 p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" />
        <div className="grid gap-1 text-xs font-bold leading-relaxed text-app-text">
          <p>Atendimento direto da loja, sem intermediários.</p>
          {location ? (
            <p className="flex items-center gap-1.5 text-muted">
              <MapPin aria-hidden="true" className="size-3.5" />
              {location}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SpecLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/50 py-2 last:border-0">
      <span className="text-muted">{label}</span>
      <strong className="text-right text-app-text">{value}</strong>
    </div>
  );
}

export function createPrimarySpecMetrics(
  detail: PublicStorefrontListingDetailData,
  mediaCount: number,
) {
  return [
    {
      icon: <Calendar className="size-3.5" />,
      label: "Ano",
      value: yearLabel(
        detail.listing.manufactureYear,
        detail.listing.modelYear,
      ),
    },
    {
      icon: <Gauge className="size-3.5" />,
      label: "Km",
      value: formatPublicVehicleMileage(detail.listing.mileageKm),
    },
    {
      icon: <Fuel className="size-3.5" />,
      label: "Combustível",
      value: formatPublicVehicleFuel(detail.listing.fuelType),
    },
    {
      icon: <Settings2 className="size-3.5" />,
      label: "Câmbio",
      value: formatPublicVehicleTransmission(detail.listing.transmission),
    },
    {
      icon: <CarFront className="size-3.5" />,
      label: "Fotos",
      value: formatMediaCount(mediaCount),
    },
    {
      icon: <SwatchBook className="size-3.5" />,
      label: "Versão",
      value: detail.listing.trimName ?? "-",
    },
  ];
}

export function createSecondarySpecLines(
  detail: PublicStorefrontListingDetailData,
) {
  return [
    {
      label: "Condição",
      value: conditionLabel(detail.listing.condition),
    },
    {
      label: "Motor",
      value: formatPublicVehicleEngine({
        aspiration: detail.listing.engineAspiration,
        displacement: detail.listing.engineDisplacement,
      }),
    },
    {
      label: "Portas",
      value: detail.listing.doors ? `${detail.listing.doors} portas` : "-",
    },
    {
      label: "Ano",
      value: yearLabel(
        detail.listing.manufactureYear,
        detail.listing.modelYear,
      ),
    },
  ];
}

export function createWhatsappUrl(phone: string | null, title: string) {
  const digits = phone?.replace(/\D/g, "");
  if (!digits) return null;
  const message = encodeURIComponent(
    `Olá! Tenho interesse no veículo: ${title}`,
  );
  return `https://wa.me/${digits}?text=${message}`;
}

export function createPhoneHref(phone: string | null) {
  const digits = phone?.replace(/\D/g, "");
  if (!digits) return null;
  return `tel:${digits.startsWith("55") ? "+" : "+55"}${digits}`;
}

export function formatMediaCount(count: number) {
  return `${count || 0} ${count === 1 ? "mídia" : "mídias"}`;
}

export function yearLabel(
  manufactureYear: number | null,
  modelYear: number | null,
) {
  if (manufactureYear && modelYear) return `${manufactureYear}/${modelYear}`;
  return String(modelYear ?? manufactureYear ?? "-");
}

export function conditionLabel(
  condition: "certified_pre_owned" | "new" | "used",
) {
  if (condition === "new") return "0 km";
  if (condition === "certified_pre_owned") return "Certificado";
  return "Seminovo";
}
