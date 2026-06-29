import {
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { CSSProperties } from "react";
import {
  PublicListingDetailPanel,
  type PublicListingDetailSnapshot,
} from "./PublicListingDetailPanel";
import { PublicVehicleCard } from "./PublicVehicleCard";
import {
  createStorefrontTheme,
  normalizeStorefrontTemplateKey,
} from "./storefrontTemplates";
import type {
  PublicStorefrontData,
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
  PublicStorefrontSettingsData,
} from "./types";

const proofItems = [
  { icon: CheckCircle2, key: "featured", label: "Estoque conferido" },
  { icon: ShieldCheck, key: "trust", label: "Dados do lojista" },
  { icon: MessageCircle, key: "financing", label: "Atendimento WhatsApp" },
];

type PublicStorefrontProps = {
  data: PublicStorefrontData & { settings: PublicStorefrontSettingsData };
  detail: PublicListingDetailSnapshot;
  onCloseListing: () => void;
  onOpenListing: (listingSlug: string) => void;
  onRetryListing: () => void;
  onSubmitListingInterest: (
    listingSlug: string,
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
};

export function PublicStorefront({
  data,
  detail,
  onCloseListing,
  onOpenListing,
  onRetryListing,
  onSubmitListingInterest,
}: PublicStorefrontProps) {
  const layoutKey = normalizeStorefrontTemplateKey(
    data.settings.site.layoutKey,
  );
  const theme = createStorefrontTheme(data.settings.site.theme, layoutKey);
  const visibleProofItems = proofItems.filter((item) =>
    theme.sections.includes(item.key),
  );
  const style = createStorefrontStyle(data.settings.site.theme);
  return (
    <main
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6 lg:py-8"
      data-layout={layoutKey}
      style={style}
    >
      <section className="public-storefront-hero">
        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          {layoutKey === "showroom" && data.settings.site.heroImageUrl ? (
            <img
              alt=""
              className="public-storefront-hero-image"
              src={data.settings.site.heroImageUrl}
            />
          ) : null}
          <div className="p-5 lg:p-6">
            <div className="mb-6 flex items-start gap-3 lg:mb-8">
              <div className="flex size-11 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Sparkles aria-hidden="true" className="size-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted">
                  {theme.badgeLabel}
                </p>
                <h2 className="text-2xl font-black md:text-4xl">
                  {theme.headline}
                </h2>
                {data.settings.site.seoDescription ? (
                  <p className="mt-2 max-w-2xl text-sm font-bold text-muted">
                    {data.settings.site.seoDescription}
                  </p>
                ) : null}
                <p className="mt-2 text-xs font-black uppercase tracking-widest text-muted">
                  {data.settings.store.publicUrl}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {visibleProofItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    className="flex min-h-20 items-center gap-3 rounded-lg bg-app p-4"
                    key={item.label}
                  >
                    <Icon aria-hidden="true" className="size-5 text-accent" />
                    <span className="text-sm font-black">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {theme.sections.includes("contact") ? (
          <LeadPanel ctaLabel={theme.ctaLabel} settings={data.settings} />
        ) : null}
      </section>

      {theme.sections.includes("featured") ? (
        <section className="public-storefront-stock">
          {data.listings.map((listing) => (
            <PublicVehicleCard
              key={listing.slug}
              listing={listing}
              onOpen={() => onOpenListing(listing.slug)}
            />
          ))}
        </section>
      ) : null}

      {detail.listingSlug ? (
        <PublicListingDetailPanel
          detail={detail}
          onClose={onCloseListing}
          onRetry={onRetryListing}
          onSubmitInterest={onSubmitListingInterest}
        />
      ) : null}
    </main>
  );
}

function createStorefrontStyle(theme: Record<string, unknown>) {
  const accentColor = readString(theme.accentColor);
  const brandColor = readString(theme.brandColor) ?? accentColor;
  const backgroundColor = readString(theme.backgroundColor);
  const style: CSSProperties & Record<`--${string}`, string> = {};

  if (accentColor) {
    style["--color-accent"] = accentColor;
    style["--color-accent-soft"] =
      `color-mix(in oklab, ${accentColor} 12%, transparent)`;
  }
  if (brandColor) style["--color-accent-strong"] = brandColor;
  if (backgroundColor) style.backgroundColor = backgroundColor;

  return Object.keys(style).length ? style : undefined;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function LeadPanel({
  ctaLabel,
  settings,
}: {
  ctaLabel: string;
  settings: PublicStorefrontSettingsData;
}) {
  return (
    <aside className="rounded-lg border border-line bg-panel p-5 lg:p-6">
      <p className="text-xs font-black uppercase tracking-widest text-muted">
        Interesse rapido
      </p>
      <h3 className="mt-2 text-xl font-black">Separar veiculo</h3>
      {settings.contact.city ? (
        <p className="mt-2 text-sm font-bold text-muted">
          {settings.contact.city}
        </p>
      ) : null}
      <div className="mt-5 grid gap-3">
        <input
          aria-label="Nome"
          className="rounded-lg border border-line bg-app p-3 font-bold"
        />
        <input
          aria-label="Telefone"
          className="rounded-lg border border-line bg-app p-3 font-bold"
        />
        <a
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 font-black text-inverse"
          href={settings.contact.whatsappUrl ?? undefined}
        >
          <MessageCircle aria-hidden="true" className="size-4" />
          {ctaLabel}
        </a>
      </div>
    </aside>
  );
}
