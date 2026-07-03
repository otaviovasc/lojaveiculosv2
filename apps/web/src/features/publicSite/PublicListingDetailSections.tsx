import { Mail, MessageCircle, Phone, Sparkles } from "lucide-react";
import { LeadCaptureForm } from "./LeadCaptureForm";
import {
  AvailableBadge,
  ColorSummary,
  DetailBadge,
  SpecLine,
  TrustNotes,
  VehicleMetric,
  conditionLabel,
  createPhoneHref,
  createPrimarySpecMetrics,
  createSecondarySpecLines,
  createWhatsappUrl,
  formatMediaCount,
} from "./PublicListingDetailParts";
import { formatPublicVehiclePrice } from "./publicVehicleFormatters";
import type {
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
  PublicStorefrontListingDetailData,
  PublicStorefrontSettingsData,
} from "./types";

export function VehicleDetailHeader({
  colorNames,
  detail,
  mediaCount,
}: {
  colorNames: readonly string[];
  detail: PublicStorefrontListingDetailData;
  mediaCount: number;
}) {
  return (
    <header className="grid gap-5 border-b border-line/60 pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <div className="flex flex-wrap gap-2">
          <AvailableBadge />
          <DetailBadge>{conditionLabel(detail.listing.condition)}</DetailBadge>
          {detail.listing.trimName ? (
            <DetailBadge>{detail.listing.trimName}</DetailBadge>
          ) : null}
          {colorNames.length ? (
            <DetailBadge>
              {colorNames.length} {colorNames.length === 1 ? "cor" : "cores"}
            </DetailBadge>
          ) : null}
        </div>
        <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.98] tracking-tight text-app-text md:text-5xl lg:text-6xl">
          {detail.listing.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-muted md:text-base">
          Veículo anunciado por {detail.store.name}. Confira fotos, ficha
          técnica e envie seu interesse para falar com um consultor.
        </p>
      </div>
      <div className="rounded-xl border border-line bg-panel p-4 shadow-sm lg:min-w-64">
        <span className="text-xs font-black uppercase tracking-[0.2em] text-muted">
          Preço anunciado
        </span>
        <p className="mt-1 text-3xl font-black tracking-tight text-accent">
          {formatPublicVehiclePrice(detail.listing.priceCents)}
        </p>
        <p className="mt-2 text-xs font-bold text-muted">
          {formatMediaCount(mediaCount)} no anúncio
        </p>
      </div>
    </header>
  );
}

export function VehicleLeadCard({
  colorNames,
  detail,
  mediaCount,
  onSubmitInterest,
  settings,
}: {
  colorNames: readonly string[];
  detail: PublicStorefrontListingDetailData;
  mediaCount: number;
  onSubmitInterest: (
    listingSlug: string,
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
  settings: PublicStorefrontSettingsData;
}) {
  const whatsappUrl =
    settings.contact.whatsappUrl ??
    createWhatsappUrl(settings.contact.whatsappPhone, detail.listing.title);
  const phoneHref = createPhoneHref(
    settings.contact.contactPhone ?? settings.contact.whatsappPhone,
  );

  return (
    <aside className="lg:sticky lg:top-20">
      <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-xl">
        <div className="border-b-4 border-accent bg-zinc-950 p-6 text-white">
          <span className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
            Oferta da loja
          </span>
          <p className="mt-2 text-4xl font-black tracking-tight">
            {formatPublicVehiclePrice(detail.listing.priceCents)}
          </p>
          <p className="mt-2 text-xs font-bold leading-relaxed text-white/65">
            Confirme disponibilidade, histórico e condições finais diretamente
            com a equipe.
          </p>
        </div>

        <div className="grid gap-4 p-5">
          <div className="grid grid-cols-2 gap-2">
            {createPrimarySpecMetrics(detail, mediaCount).map((item) => (
              <VehicleMetric key={item.label} {...item} />
            ))}
          </div>

          {colorNames.length > 0 ? (
            <ColorSummary colorNames={colorNames} />
          ) : null}

          <div className="grid gap-2">
            {whatsappUrl ? (
              <a
                className="flex min-h-12 items-center justify-center gap-2 rounded bg-success px-5 text-xs font-black uppercase tracking-[0.12em] text-success-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-success/90 active:translate-y-0 active:scale-95"
                href={whatsappUrl}
                rel="noreferrer"
                target="_blank"
              >
                <MessageCircle aria-hidden="true" className="size-4" />
                WhatsApp
              </a>
            ) : null}
            {phoneHref ? (
              <a
                className="flex min-h-11 items-center justify-center gap-2 rounded border border-line bg-app px-5 text-xs font-black uppercase tracking-[0.12em] text-app-text transition-all hover:border-accent/40 hover:bg-accent-soft hover:text-accent active:scale-95"
                href={phoneHref}
              >
                <Phone aria-hidden="true" className="size-4" />
                Ligar para loja
              </a>
            ) : null}
          </div>

          <TrustNotes settings={settings} />

          <div className="rounded-xl border border-line bg-app p-4">
            <div className="flex items-center gap-2">
              <Mail aria-hidden="true" className="size-4 text-accent" />
              <p className="text-xs font-black uppercase tracking-[0.18em] text-app-text">
                Enviar interesse
              </p>
            </div>
            <LeadCaptureForm
              listingSlug={detail.listing.slug}
              onSubmitInterest={onSubmitInterest}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}

export function VehicleStory({
  colorNames,
  detail,
}: {
  colorNames: readonly string[];
  detail: PublicStorefrontListingDetailData;
}) {
  return (
    <section className="grid gap-5 rounded-xl border border-line bg-panel p-5 shadow-sm lg:grid-cols-[1fr_0.82fr]">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-app-text">
            Destaques do veículo
          </h2>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-muted">
          {detail.listing.description ??
            "Entre em contato com a loja para receber a ficha completa, fotos adicionais e condições atualizadas deste veículo."}
        </p>
      </div>

      <div className="grid gap-2 text-xs font-bold">
        {createSecondarySpecLines(detail).map((item) => (
          <SpecLine key={item.label} {...item} />
        ))}
        {colorNames.length ? (
          <SpecLine label="Cores" value={colorNames.join(", ")} />
        ) : null}
      </div>
    </section>
  );
}

export function UnitMediaTabs({
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
          className="rounded border border-line bg-panel px-3 py-2 text-xs font-black text-muted shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 data-[selected=true]:border-accent data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent cursor-pointer"
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
