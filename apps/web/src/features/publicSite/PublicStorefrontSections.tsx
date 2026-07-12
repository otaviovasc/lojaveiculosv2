import { Calendar, Gauge, Search, ArrowDown, Sparkles } from "lucide-react";
import {
  AboutSection,
  BrandMark,
  TestimonialsSection,
  createVisibleProofItems,
} from "./PublicStorefrontSubsections";
import { PublicVehicleCard } from "./PublicVehicleCard";
import {
  formatPublicVehicleMileage,
  formatPublicVehiclePrice,
} from "./publicVehicleFormatters";
import type { createStorefrontTheme } from "./storefrontTemplates";
import {
  readString,
  searchListings,
  stockEyebrow,
  stockTitle,
  type VisibleStorefrontSection,
} from "./publicStorefrontTheme";
import {
  PublicStorefrontHeroMedia,
  resolvePublicStorefrontFeaturedListing,
} from "./PublicStorefrontHeroMedia";
import type {
  PublicStorefrontData,
  PublicStorefrontSettingsData,
  PublicVehicleListing,
} from "./types";

export { AboutSection, TestimonialsSection };

export function HeroSection({
  data,
  sections,
  theme,
  onOpenListing,
}: {
  data: PublicStorefrontData & { settings: PublicStorefrontSettingsData };
  sections: readonly VisibleStorefrontSection[];
  theme: ReturnType<typeof createStorefrontTheme>;
  onOpenListing?: (listingSlug: string) => void;
}) {
  const rawTheme = data.settings.site.theme;
  const heroSubtitle =
    readString(rawTheme.heroSubtitle) ?? data.settings.site.seoDescription;
  const brandName =
    readString(rawTheme.corretorName) ?? data.settings.store.name;
  const brandLine = readString(rawTheme.corretorCreci);
  const logoUrl = readString(rawTheme.logoUrl);
  const photoUrl = readString(rawTheme.corretorPhotoUrl);
  const visibleProofItems = createVisibleProofItems(sections);

  const featuredListing = resolvePublicStorefrontFeaturedListing({
    heroImageUrl: data.settings.site.heroImageUrl,
    listings: data.listings,
    theme: rawTheme,
  });

  return (
    <section className="relative min-h-[85vh] lg:h-[90vh] flex items-center justify-center overflow-hidden bg-zinc-950 text-white">
      {/* Full-bleed background image with dark overlay */}
      <div className="absolute inset-0 z-0">
        <PublicStorefrontHeroMedia
          heroImageUrl={data.settings.site.heroImageUrl}
          listings={data.listings}
          theme={rawTheme}
        />
        {/* Flat dark overlay inside hero only */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-transparent z-1" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-transparent z-1" />
      </div>

      <div className="public-storefront-shell relative z-10 grid gap-12 px-6 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="flex flex-col justify-center text-left">
          {/* Brand/Identity header info */}
          <div className="mb-6 flex items-center gap-3">
            <BrandMark logoUrl={logoUrl} photoUrl={photoUrl} />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.26em] text-accent">
                {theme.badgeLabel || "Premium Dealership"}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold text-zinc-300">
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
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl text-white uppercase">
            {theme.headline}
          </h1>

          {/* Subtitle */}
          {heroSubtitle && (
            <p className="mt-5 max-w-xl text-base font-medium leading-relaxed text-zinc-300 sm:text-lg">
              {heroSubtitle}
            </p>
          )}

          {featuredListing && onOpenListing ? (
            <button
              className="mt-5 inline-flex max-w-xl flex-wrap items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left text-sm font-bold text-zinc-200 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/45 hover:bg-white/10 active:translate-y-0 active:scale-[0.99]"
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
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-8 text-sm font-bold text-inverse shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-95 cursor-pointer"
              href="#estoque"
            >
              Ver estoque
            </a>
            <a
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-8 text-sm font-bold text-white backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 active:translate-y-0 active:scale-95 cursor-pointer"
              href="#contato"
            >
              {theme.ctaLabel}
            </a>
          </div>

          {/* Proof banners */}
          {visibleProofItems.length > 0 && (
            <div className="mt-10 grid gap-0 overflow-hidden rounded-xl border border-white/10 bg-black/35 backdrop-blur sm:grid-cols-3">
              {visibleProofItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    className="flex min-h-12 items-center gap-3 border-b border-white/5 p-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
                    key={item.label}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                      <Icon aria-hidden="true" className="size-3.5" />
                    </span>
                    <span className="text-xs font-bold tracking-wide text-zinc-200">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Spec Card (Desktop Only) */}
        {featuredListing && onOpenListing ? (
          <div className="hidden lg:flex flex-col w-full max-w-sm ml-auto bg-black/40 backdrop-blur-md border border-white/15 rounded-lg p-6 shadow-2xl">
            <div className="mb-4">
              <span className="bg-accent text-white text-xs font-black tracking-widest uppercase px-2 py-0.5 rounded">
                Destaque da semana
              </span>
              <h3 className="text-xl font-extrabold text-white mt-2 leading-tight">
                {featuredListing.title}
              </h3>
            </div>

            <div className="mt-4 space-y-3.5 border-t border-white/10 pt-4">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-zinc-400 font-medium">Ano Modelo</span>
                <span className="text-white font-bold">
                  {featuredListing.modelYear ??
                    featuredListing.manufactureYear ??
                    "-"}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-zinc-400 font-medium">Quilometragem</span>
                <span className="text-white font-bold">
                  {formatPublicVehicleMileage(featuredListing.mileageKm)}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-zinc-400 font-medium">Preço</span>
                <span className="text-accent font-black text-lg">
                  {formatPublicVehiclePrice(featuredListing.priceCents)}
                </span>
              </div>
            </div>

            <button
              onClick={() => onOpenListing(featuredListing.slug)}
              className="mt-6 w-full flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-inverse transition-all duration-300 hover:brightness-110 cursor-pointer"
            >
              Conhecer veículo →
            </button>
          </div>
        ) : (
          <div className="hidden lg:block relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-2xl">
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white">
              <Sparkles
                aria-hidden="true"
                className="size-10 text-accent animate-pulse"
              />
              <p className="mt-4 text-base font-bold">Qualidade & Confiança</p>
              <p className="mt-2 text-xs text-zinc-400 max-w-xs">
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
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-1 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors cursor-pointer"
      >
        <span>Ver Estoque</span>
        <ArrowDown className="size-3 text-accent animate-bounce" />
      </a>
    </section>
  );
}

export function StockSection({
  listings,
  onOpenListing,
  query,
  sectionType,
  setQuery,
}: {
  listings: readonly PublicVehicleListing[];
  onOpenListing: (listingSlug: string) => void;
  query: string;
  sectionType: string;
  setQuery: (value: string) => void;
}) {
  const isSearch = sectionType === "search";
  const isAll = sectionType === "all_properties";
  const filteredListings =
    isSearch || isAll ? searchListings(listings, query) : listings;
  const visibleListings =
    sectionType === "featured"
      ? filteredListings.slice(0, 6)
      : filteredListings;

  return (
    <section className="border-b border-line bg-app" id="estoque">
      <div className="public-storefront-shell px-6 py-16 md:py-20">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between border-b border-line/60 pb-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-accent-strong">
              {stockEyebrow(sectionType)}
            </p>
            <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight md:text-4xl text-app-text">
              {stockTitle(sectionType)}
            </h2>
            <p className="mt-2 text-sm font-semibold text-muted">
              Mostrando {visibleListings.length}{" "}
              {visibleListings.length === 1 ? "veículo" : "veículos"}
            </p>
          </div>

          {/* Show search discovery bar for both search and all properties */}
          {(isSearch || isAll) && (
            <label className="relative block w-full sm:w-80">
              <span className="sr-only">Buscar veículo</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted"
              />
              <input
                className="min-h-11 w-full rounded-xl border border-line bg-panel pl-11 pr-4 text-sm font-semibold text-app-text outline-none shadow-sm transition-all focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por modelo"
                value={query}
              />
            </label>
          )}
        </div>

        {visibleListings.length ? (
          <div className="public-storefront-stock">
            {visibleListings.map((listing) => (
              <PublicVehicleCard
                key={listing.slug}
                listing={listing}
                onOpen={() => onOpenListing(listing.slug)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line bg-panel p-12 text-center text-sm font-semibold text-muted shadow-sm">
            Nenhum veículo encontrado.
          </div>
        )}
      </div>
    </section>
  );
}
