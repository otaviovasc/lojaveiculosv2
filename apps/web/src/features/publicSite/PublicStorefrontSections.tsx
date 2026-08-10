import {
  Search,
  ArrowDown,
  Sparkles,
  Calendar,
  Car,
  Gauge,
} from "lucide-react";
import { useState } from "react";
import {
  AboutSection,
  BrandMark,
  TestimonialsSection,
  createVisibleProofItems,
} from "./PublicStorefrontSubsections";
import { SplitHeroSection } from "./PublicStorefrontHeroSplit";
import { PublicVehicleCard } from "./PublicVehicleCard";
import {
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
} from "./publicVehicleFormatters";
import {
  readString,
  searchListings,
  stockEyebrow,
  stockTitle,
} from "./publicStorefrontTheme";
import {
  PublicStorefrontHeroMedia,
  resolvePublicStorefrontFeaturedListing,
} from "./PublicStorefrontHeroMedia";
import { useStorefrontSectionReveal } from "./sections/useStorefrontMotion";
import type { StorefrontSectionProps } from "./sections/types";
import type { PublicVehicleListing } from "./types";

export { AboutSection, TestimonialsSection };

export function HeroSection(props: StorefrontSectionProps) {
  if (props.spec.variant === "split") {
    return <SplitHeroSection {...props} />;
  }
  return <FullscreenHeroSection {...props} />;
}

function FullscreenHeroSection({
  copy,
  data,
  onOpenListing,
  sections,
  tokens,
}: StorefrontSectionProps) {
  const rawTheme = data.settings.site.theme;
  const heroSubtitle =
    readString(rawTheme.heroSubtitle) ?? data.settings.site.seoDescription;
  const brandName = tokens.brand.displayName ?? data.settings.store.name;
  const brandLine = tokens.brand.displayLine;
  const visibleProofItems = createVisibleProofItems(sections);
  const revealRef = useStorefrontSectionReveal<HTMLElement>(
    tokens.motion.style,
  );

  const featuredListing = resolvePublicStorefrontFeaturedListing({
    heroImageUrl: data.settings.site.heroImageUrl,
    listings: data.listings,
    theme: rawTheme,
  });

  return (
    <section
      className="relative min-h-[85vh] lg:h-[90vh] flex items-center justify-center overflow-hidden bg-[var(--sf-chrome-bg)] text-[var(--sf-chrome-ink)]"
      ref={revealRef}
    >
      {/* Full-bleed background image with dark overlay */}
      <div className="sf-hero-media absolute inset-0 z-0">
        <PublicStorefrontHeroMedia
          heroImageUrl={data.settings.site.heroImageUrl}
          listings={data.listings}
          theme={rawTheme}
        />
        {/* Flat scrim inside hero only, derived from the chrome tokens */}
        <div className="absolute inset-0 z-1 [background:linear-gradient(to_right,color-mix(in_oklab,var(--sf-chrome-bg)_85%,transparent),color-mix(in_oklab,var(--sf-chrome-bg)_60%,transparent),transparent)]" />
        <div className="absolute inset-0 z-1 [background:linear-gradient(to_top,color-mix(in_oklab,var(--sf-chrome-bg)_90%,transparent),transparent)]" />
      </div>

      <div className="public-storefront-shell relative z-10 grid gap-12 px-6 pb-12 pt-28 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-12">
        <div className="flex flex-col justify-center text-left">
          {/* Brand/Identity header info */}
          <div className="mb-6 flex items-center gap-3" data-sf-reveal>
            <BrandMark
              logoUrl={tokens.brand.logoUrl}
              photoUrl={tokens.brand.photoUrl}
            />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.26em] text-accent">
                {copy.badgeLabel || "Premium Dealership"}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold text-[var(--sf-chrome-ink-muted)]">
                <span>{brandName}</span>
                {brandLine ? (
                  <>
                    <span aria-hidden="true" className="opacity-50">
                      •
                    </span>
                    <span>{brandLine}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Headline context */}
          <h1
            className="max-w-3xl text-[length:var(--sf-headline-size)] font-extrabold leading-[1.05] tracking-tight uppercase"
            data-sf-reveal
          >
            {copy.headline}
          </h1>

          {/* Subtitle */}
          {heroSubtitle && (
            <p
              className="mt-5 max-w-xl text-base font-medium leading-relaxed text-[var(--sf-chrome-ink-muted)] sm:text-lg"
              data-sf-reveal
            >
              {heroSubtitle}
            </p>
          )}

          {featuredListing ? (
            <button
              className="mt-5 inline-flex max-w-xl flex-wrap items-center gap-2 rounded-xl border border-[var(--sf-chrome-line)] bg-[var(--sf-chrome-glass)] px-3 py-2 text-left text-sm font-bold text-[var(--sf-chrome-ink)] backdrop-blur transition-all duration-[var(--sf-motion-micro)] hover:-translate-y-0.5 hover:border-accent/45 active:translate-y-0 active:scale-[0.99]"
              data-sf-reveal
              onClick={() => onOpenListing(featuredListing.slug)}
              type="button"
            >
              <span className="rounded bg-accent/20 px-2 py-1 text-xs font-black uppercase tracking-widest text-accent">
                Destaque
              </span>
              <span className="min-w-0 flex-1 basis-56 leading-snug">
                {featuredListing.title}
              </span>
            </button>
          ) : null}

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap gap-4" data-sf-reveal>
            <a
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-8 text-sm font-bold text-accent-foreground transition-all duration-[var(--sf-motion-micro)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer"
              href="#estoque"
            >
              Ver estoque
            </a>
            <a
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--sf-chrome-line)] bg-[var(--sf-chrome-glass)] px-8 text-sm font-bold backdrop-blur transition-all duration-[var(--sf-motion-micro)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer"
              href="#contato"
            >
              {copy.ctaLabel}
            </a>
          </div>

          {/* Proof banners */}
          {visibleProofItems.length > 0 && (
            <div
              className="mt-10 grid gap-0 overflow-hidden rounded-xl border border-[var(--sf-chrome-line)] bg-[var(--sf-chrome-glass)] backdrop-blur sm:grid-cols-3"
              data-sf-reveal
            >
              {visibleProofItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    className="flex min-h-12 items-center gap-3 border-b border-[var(--sf-chrome-line)] p-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
                    key={item.label}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                      <Icon aria-hidden="true" className="size-3.5" />
                    </span>
                    <span className="text-xs font-bold tracking-wide">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Spec Card (Desktop Only) */}
        {featuredListing ? (
          <div className="hidden lg:flex flex-col w-full max-w-sm ml-auto bg-[var(--sf-chrome-glass)] backdrop-blur-md border border-[var(--sf-chrome-line)] rounded-lg p-6 shadow-2xl">
            <div className="mb-4">
              <span className="bg-accent text-accent-foreground text-xs font-black tracking-widest uppercase px-2 py-0.5 rounded">
                Destaque da semana
              </span>
              <h3 className="text-xl font-extrabold mt-2 leading-tight">
                {featuredListing.title}
              </h3>
            </div>

            <div className="mt-4 space-y-3.5 border-t border-[var(--sf-chrome-line)] pt-4">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-[var(--sf-chrome-ink-muted)] font-medium">
                  Ano Modelo
                </span>
                <span className="font-bold">
                  {featuredListing.modelYear ??
                    featuredListing.manufactureYear ??
                    "-"}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-[var(--sf-chrome-ink-muted)] font-medium">
                  Quilometragem
                </span>
                <span className="font-bold">
                  {formatPublicVehicleMileage(featuredListing.mileageKm)}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-[var(--sf-chrome-ink-muted)] font-medium">
                  Preço
                </span>
                <span className="text-accent font-black text-lg">
                  {formatPublicVehiclePrice(featuredListing.priceCents)}
                </span>
              </div>
            </div>

            <button
              onClick={() => onOpenListing(featuredListing.slug)}
              className="mt-6 w-full flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-accent-foreground transition-all duration-[var(--sf-motion-micro)] hover:brightness-110 cursor-pointer"
            >
              Conhecer veículo →
            </button>
          </div>
        ) : (
          <div className="hidden lg:block relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-[var(--sf-chrome-line)] bg-[var(--sf-chrome-glass)] shadow-2xl">
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <Sparkles
                aria-hidden="true"
                className="size-10 text-accent animate-pulse"
              />
              <p className="mt-4 text-base font-bold">Qualidade & Confiança</p>
              <p className="mt-2 text-xs text-[var(--sf-chrome-ink-muted)] max-w-xs">
                Encontre veículos revisados com garantia e procedência
                exclusiva.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Down Hint */}
      <a
        href="#estoque"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-1 text-xs font-black uppercase tracking-widest text-[var(--sf-chrome-ink-muted)] hover:text-[var(--sf-chrome-ink)] transition-colors cursor-pointer"
      >
        <span>Ver Estoque</span>
        <ArrowDown className="size-3 text-accent animate-bounce" />
      </a>
    </section>
  );
}

const filterBarVariants = new Set(["search", "all_properties", "grid-compact"]);

export function StockSection({
  data,
  onOpenListing,
  spec,
  tokens,
}: StorefrontSectionProps) {
  const [query, setQuery] = useState("");
  const variant = spec.variant;
  const listings = data.listings;
  const hasFilterBar = filterBarVariants.has(variant);
  const filteredListings = hasFilterBar
    ? searchListings(listings, query)
    : listings;
  const revealRef = useStorefrontSectionReveal<HTMLElement>(
    tokens.motion.style,
  );

  const featuredListing =
    variant === "featured-large" ? (filteredListings[0] ?? null) : null;
  const visibleListings =
    variant === "featured-large" ? filteredListings.slice(1) : filteredListings;

  return (
    <section
      className="border-b border-line bg-app"
      id="estoque"
      ref={revealRef}
    >
      <div className="public-storefront-shell px-6 py-[var(--sf-section-pad)]">
        <div
          className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between border-b border-line/60 pb-6"
          data-sf-reveal
        >
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-accent-strong">
              {stockEyebrow(variant)}
            </p>
            <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight md:text-4xl text-app-text">
              {stockTitle(variant)}
            </h2>
            <p className="mt-2 text-sm font-semibold text-muted">
              Mostrando {visibleListings.length + (featuredListing ? 1 : 0)}{" "}
              {visibleListings.length + (featuredListing ? 1 : 0) === 1
                ? "veículo"
                : "veículos"}
            </p>
          </div>

          {/* Discovery bar for the filter-driven variants */}
          {hasFilterBar && (
            <label className="relative block w-full sm:w-80">
              <span className="sr-only">Buscar veículo</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted"
              />
              <input
                className="min-h-11 w-full rounded-[var(--sf-radius)] border border-line bg-panel pl-11 pr-4 text-sm font-semibold text-app-text outline-none shadow-sm transition-all duration-[var(--sf-motion-micro)] focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por modelo"
                value={query}
              />
            </label>
          )}
        </div>

        {featuredListing ? (
          <FeaturedStockCard
            listing={featuredListing}
            onOpen={() => onOpenListing(featuredListing.slug)}
          />
        ) : null}

        {visibleListings.length ? (
          <div
            className={
              variant === "grid-compact"
                ? "public-storefront-stock public-storefront-stock--compact"
                : "public-storefront-stock"
            }
            data-sf-reveal
          >
            {visibleListings.map((listing) => (
              <PublicVehicleCard
                key={listing.slug}
                listing={listing}
                onOpen={() => onOpenListing(listing.slug)}
              />
            ))}
          </div>
        ) : featuredListing ? null : (
          <div className="rounded-[var(--sf-radius)] border border-dashed border-line bg-panel p-12 text-center text-sm font-semibold text-muted shadow-sm">
            Nenhum veículo encontrado.
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Large cinematic featured card (Aurora stock): chrome-dark panel with the
 * lead vehicle's media, key specs, and price before the remaining grid.
 */
function FeaturedStockCard({
  listing,
  onOpen,
}: {
  listing: PublicVehicleListing;
  onOpen: () => void;
}) {
  return (
    <article className="group mb-[var(--sf-card-gap)] grid overflow-hidden rounded-[var(--sf-radius)] border border-[var(--sf-chrome-line)] bg-[var(--sf-chrome-bg)] text-[var(--sf-chrome-ink)] shadow-2xl lg:grid-cols-[1.25fr_0.75fr]">
      <button
        aria-label={`Abrir detalhes de ${listing.title}`}
        className="relative aspect-[16/10] w-full cursor-pointer overflow-hidden lg:aspect-auto lg:min-h-80"
        onClick={onOpen}
        type="button"
      >
        {listing.thumbnailUrl ? (
          <img
            alt={listing.title}
            className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            src={listing.thumbnailUrl}
          />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--sf-chrome-ink-muted)]">
            <Car aria-hidden="true" className="size-10 opacity-40" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-70">
              Fotos em breve
            </span>
          </span>
        )}
        <span className="absolute left-4 top-4 rounded-[var(--sf-radius)] bg-accent px-2.5 py-1 text-xs font-black uppercase tracking-widest text-accent-foreground shadow-sm">
          Destaque da loja
        </span>
      </button>

      <div className="flex flex-col justify-center gap-4 p-6 md:p-8">
        <h3 className="text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">
          {listing.title}
        </h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-[var(--sf-chrome-ink-muted)]">
          <span className="flex items-center gap-1.5">
            <Calendar aria-hidden="true" className="size-3.5" />
            {listing.modelYear ?? listing.manufactureYear ?? "-"}
          </span>
          <span className="flex items-center gap-1.5">
            <Gauge aria-hidden="true" className="size-3.5" />
            {formatPublicVehicleMileage(listing.mileageKm)}
          </span>
        </div>
        <p className="text-3xl font-black tracking-tight text-accent">
          {formatPublicVehiclePrice(listing.priceCents)}
        </p>
        <button
          className="mt-2 inline-flex min-h-12 items-center justify-center rounded-[var(--sf-radius)] bg-accent px-8 text-sm font-bold text-accent-foreground transition-all duration-[var(--sf-motion-micro)] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-95 cursor-pointer"
          onClick={onOpen}
          type="button"
        >
          Conhecer veículo →
        </button>
      </div>
    </article>
  );
}
