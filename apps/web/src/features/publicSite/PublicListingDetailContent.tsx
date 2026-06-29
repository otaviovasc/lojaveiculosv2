import {
  Calendar,
  CarFront,
  Fuel,
  Gauge,
  MessageCircle,
  Palette,
  Settings2,
  ShieldCheck,
  Sparkles,
  SwatchBook,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { LeadCaptureForm } from "./LeadCaptureForm";
import { HeroMedia, MediaStrip } from "./PublicListingGallery";
import {
  formatPublicVehicleEngine,
  formatPublicVehicleFuel,
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
  formatPublicVehicleTransmission,
} from "./publicVehicleFormatters";
import type {
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
  PublicStorefrontListingDetailData,
} from "./types";

export function PublicListingDetailContent({
  detail,
  onSubmitInterest,
}: {
  detail: PublicStorefrontListingDetailData;
  onSubmitInterest: (
    listingSlug: string,
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
}) {
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const mediaGroups = useMemo(
    () => detail.listing.mediaGroups.filter((group) => group.media.length > 0),
    [detail.listing.mediaGroups],
  );
  const activeGroup =
    mediaGroups.find((group) => group.unitId === selectedUnitId) ??
    mediaGroups[0] ??
    null;
  const activeMedia = activeGroup?.media.length
    ? activeGroup.media
    : detail.listing.media;
  const selectedMedia =
    activeMedia.find((item) => item.url === selectedMediaUrl) ??
    activeMedia[0] ??
    null;
  const heroUrl = selectedMedia?.url ?? detail.listing.thumbnailUrl;
  const colorNames = Array.from(
    new Set(
      detail.listing.mediaGroups
        .map((group) => group.colorName)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  useEffect(() => {
    const firstGroup = mediaGroups[0] ?? null;
    setSelectedUnitId(firstGroup?.unitId ?? null);
    setSelectedMediaUrl(
      firstGroup?.media[0]?.url ?? detail.listing.media[0]?.url ?? null,
    );
  }, [detail.listing.slug, detail.listing.media, mediaGroups]);

  const handleGroupSelect = (unitId: string) => {
    const nextGroup = mediaGroups.find((group) => group.unitId === unitId);
    setSelectedUnitId(unitId);
    setSelectedMediaUrl(nextGroup?.media[0]?.url ?? null);
  };

  return (
    <div className="grid gap-0 lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
      <div className="grid content-start gap-5 bg-app p-4 md:p-6">
        <HeroMedia
          altText={selectedMedia?.altText ?? detail.listing.title}
          heroUrl={heroUrl}
          kind={selectedMedia?.kind ?? "photo"}
        />
        <UnitMediaTabs
          groups={mediaGroups}
          onSelect={handleGroupSelect}
          selectedUnitId={activeGroup?.unitId ?? null}
        />
        <MediaStrip
          media={activeMedia}
          onSelect={setSelectedMediaUrl}
          selectedUrl={selectedMedia?.url ?? null}
        />
        <VehicleStory detail={detail} />
      </div>

      <aside className="flex flex-col border-t border-line/60 bg-panel p-5 md:p-7 lg:border-l lg:border-t-0">
        <div className="lg:sticky lg:top-6">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted/80">
            {detail.store.slug}.lojaveiculos.com.br
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-app-text md:text-3xl">
            {detail.listing.title}
          </h2>
          {detail.listing.trimName ? (
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-muted">
              {detail.listing.trimName}
            </p>
          ) : null}

          <div className="mt-5 rounded-xl border border-line bg-app p-4">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted/80">
              Preco anunciado
            </span>
            <p className="mt-1 text-3xl font-black tracking-tight text-accent">
              {formatPublicVehiclePrice(detail.listing.priceCents)}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {createSpecMetrics(detail, activeMedia.length).map((item) => (
              <VehicleMetric key={item.label} {...item} />
            ))}
          </div>

          {colorNames.length > 0 ? (
            <div className="mt-4 rounded-xl border border-line bg-app p-4">
              <span className="text-[9px] font-black uppercase tracking-wider text-muted/80">
                Cores disponiveis
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                {colorNames.map((colorName) => (
                  <span
                    className="rounded border border-line bg-panel px-2.5 py-1 text-[10px] font-black text-app-text"
                    key={colorName}
                  >
                    {colorName}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-accent/15 bg-accent-soft/35 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" />
              <p className="text-xs font-bold leading-relaxed text-app-text">
                Fale direto com a loja para confirmar disponibilidade,
                historico, condicoes de compra e agendamento de visita.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-line bg-app p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4 text-accent" />
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-app-text">
                Falar com consultor
              </p>
            </div>
            <LeadCaptureForm
              listingSlug={detail.listing.slug}
              onSubmitInterest={onSubmitInterest}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}

function VehicleStory({
  detail,
}: {
  detail: PublicStorefrontListingDetailData;
}) {
  return (
    <section className="grid gap-4 rounded-xl border border-line bg-panel p-5 md:grid-cols-[1fr_0.72fr]">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-app-text">
            Destaques do veiculo
          </h3>
        </div>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-muted whitespace-pre-wrap">
          {detail.listing.description ??
            "Entre em contato com a loja para receber a ficha completa, fotos adicionais e condicoes atualizadas deste veiculo."}
        </p>
      </div>
      <div className="grid gap-2 text-xs font-bold">
        <SpecLine
          label="Condicao"
          value={conditionLabel(detail.listing.condition)}
        />
        <SpecLine
          label="Motor"
          value={formatPublicVehicleEngine({
            aspiration: detail.listing.engineAspiration,
            displacement: detail.listing.engineDisplacement,
          })}
        />
        <SpecLine
          label="Portas"
          value={detail.listing.doors ? `${detail.listing.doors} portas` : "-"}
        />
      </div>
    </section>
  );
}

function UnitMediaTabs({
  groups,
  onSelect,
  selectedUnitId,
}: {
  groups: readonly {
    colorName: string | null;
    media: readonly unknown[];
    unitId: string;
  }[];
  onSelect: (unitId: string) => void;
  selectedUnitId: string | null;
}) {
  if (groups.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Variantes">
      {groups.map((group, index) => (
        <button
          aria-pressed={group.unitId === selectedUnitId}
          className="rounded border border-line bg-panel px-3 py-2 text-xs font-bold text-muted transition-all hover:-translate-y-0.5 hover:border-accent/40 data-[selected=true]:border-accent data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent cursor-pointer"
          data-selected={group.unitId === selectedUnitId ? "true" : undefined}
          key={group.unitId}
          onClick={() => onSelect(group.unitId)}
          type="button"
        >
          {group.colorName ?? `Unidade ${index + 1}`}
        </button>
      ))}
    </div>
  );
}

function VehicleMetric({
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
        <span className="text-[9px] font-black uppercase tracking-wider">
          {label}
        </span>
      </div>
      <strong className="mt-1 block text-sm font-extrabold text-app-text">
        {value}
      </strong>
    </div>
  );
}

function SpecLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/50 py-2 last:border-0">
      <span className="text-muted">{label}</span>
      <strong className="text-right text-app-text">{value}</strong>
    </div>
  );
}

function createSpecMetrics(
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
      label: "Combustivel",
      value: formatPublicVehicleFuel(detail.listing.fuelType),
    },
    {
      icon: <Settings2 className="size-3.5" />,
      label: "Cambio",
      value: formatPublicVehicleTransmission(detail.listing.transmission),
    },
    {
      icon: <Palette className="size-3.5" />,
      label: "Cores",
      value: detail.listing.mediaGroups.length || "-",
    },
    {
      icon: <CarFront className="size-3.5" />,
      label: "Fotos",
      value: `${mediaCount} imagens`,
    },
    {
      icon: <SwatchBook className="size-3.5" />,
      label: "Versao",
      value: detail.listing.trimName ?? "-",
    },
  ];
}

function yearLabel(manufactureYear: number | null, modelYear: number | null) {
  if (manufactureYear && modelYear) return `${manufactureYear}/${modelYear}`;
  return String(modelYear ?? manufactureYear ?? "-");
}

function conditionLabel(condition: "certified_pre_owned" | "new" | "used") {
  if (condition === "new") return "0 km";
  if (condition === "certified_pre_owned") return "Certificado";
  return "Seminovo";
}
