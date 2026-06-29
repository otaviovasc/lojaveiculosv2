import {
  CheckCircle2,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { PublicVehicleCard } from "./PublicVehicleCard";
import type { createStorefrontTheme } from "./storefrontTemplates";
import {
  readString,
  readTestimonials,
  searchListings,
  stockEyebrow,
  stockTitle,
} from "./publicStorefrontTheme";
import type { VisibleStorefrontSection } from "./publicStorefrontTheme";
import type {
  PublicStorefrontData,
  PublicStorefrontSettingsData,
  PublicVehicleListing,
} from "./types";

const proofItems = [
  { icon: CheckCircle2, key: "featured", label: "Estoque conferido" },
  { icon: ShieldCheck, key: "trust", label: "Dados do lojista" },
  { icon: MessageCircle, key: "financing", label: "Atendimento WhatsApp" },
];

export function HeroSection({
  data,
  sections,
  theme,
}: {
  data: PublicStorefrontData & { settings: PublicStorefrontSettingsData };
  sections: readonly VisibleStorefrontSection[];
  theme: ReturnType<typeof createStorefrontTheme>;
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

  return (
    <section className="relative overflow-hidden border-b border-line bg-[radial-gradient(circle_at_85%_10%,color-mix(in_oklab,var(--color-accent)_10%,transparent),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
      <div className="public-storefront-shell grid min-h-[36rem] gap-10 px-4 py-10 md:px-6 md:py-12 lg:min-h-[42rem] lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-14">
        <div className="flex min-w-0 flex-col justify-center">
          <div className="max-w-2xl">
            <div className="mb-7 flex items-center gap-3">
              <BrandMark logoUrl={logoUrl} photoUrl={photoUrl} />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-strong">
                  {theme.badgeLabel}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted">
                  <span>{brandName}</span>
                  {brandLine ? <span>{brandLine}</span> : null}
                  <span>{data.settings.store.publicUrl}</span>
                </div>
              </div>
            </div>

            <h1 className="max-w-3xl break-words text-4xl font-semibold leading-[0.95] tracking-tight text-app-text md:text-6xl lg:text-7xl">
              {theme.headline}
            </h1>

            {heroSubtitle ? (
              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-muted md:text-xl">
                {heroSubtitle}
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-inverse shadow-[0_18px_44px_color-mix(in_oklab,var(--color-accent)_24%,transparent)] transition-[box-shadow,transform,filter] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98]"
                href="#estoque"
              >
                Ver estoque
              </a>
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-panel px-6 text-sm font-semibold text-app-text shadow-[0_12px_34px_rgb(15_23_42_/_0.06)] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_18px_44px_rgb(15_23_42_/_0.09)] active:translate-y-0 active:scale-[0.98]"
                href="#contato"
              >
                {theme.ctaLabel}
              </a>
            </div>
          </div>

          {visibleProofItems.length ? (
            <div className="mt-10 grid gap-0 overflow-hidden rounded-2xl border border-line bg-panel/80 shadow-[0_18px_55px_rgb(15_23_42_/_0.06)] backdrop-blur sm:grid-cols-3">
              {visibleProofItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    className="flex min-h-20 items-center gap-3 border-b border-line/70 p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
                    key={item.label}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="text-sm font-semibold text-app-text">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="group relative min-h-[22rem] overflow-hidden rounded-[2rem] border border-white bg-accent-soft shadow-[0_30px_90px_rgb(15_23_42_/_0.16)] lg:min-h-[32rem]">
          {data.settings.site.heroImageUrl ? (
            <img
              alt=""
              className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
              src={data.settings.site.heroImageUrl}
            />
          ) : (
            <div className="grid size-full place-items-center text-accent">
              <Sparkles aria-hidden="true" className="size-16" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10" />
          <div className="absolute bottom-5 left-5 rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_18px_50px_rgb(15_23_42_/_0.12)] backdrop-blur">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
              Estoque selecionado
            </p>
            <p className="mt-1 text-lg font-semibold text-app-text">
              {data.listings.length} veiculos publicados
            </p>
          </div>
        </div>
      </div>
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
  const filteredListings = isSearch
    ? searchListings(listings, query)
    : listings;
  const visibleListings =
    sectionType === "featured"
      ? filteredListings.slice(0, 6)
      : filteredListings;
  return (
    <section className="border-b border-line bg-app" id="estoque">
      <div className="public-storefront-shell px-4 py-14 md:px-6 md:py-20">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-strong">
              {stockEyebrow(sectionType)}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">
              {stockTitle(sectionType)}
            </h2>
          </div>
          {isSearch ? (
            <label className="relative block sm:w-80">
              <span className="sr-only">Buscar veiculo</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted"
              />
              <input
                className="min-h-12 w-full rounded-full border border-line bg-panel pl-11 pr-4 text-sm font-medium text-app-text outline-none shadow-[0_12px_34px_rgb(15_23_42_/_0.05)] transition-[border-color,box-shadow] focus:border-accent/50 focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_14%,transparent)]"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por modelo"
                value={query}
              />
            </label>
          ) : null}
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
          <div className="rounded-2xl border border-dashed border-line bg-panel p-10 text-center text-sm font-semibold text-muted">
            Nenhum veiculo encontrado.
          </div>
        )}
      </div>
    </section>
  );
}

export function AboutSection({
  data,
}: {
  data: PublicStorefrontData & { settings: PublicStorefrontSettingsData };
}) {
  const theme = data.settings.site.theme;
  const imageUrl = readString(theme.aboutImageUrl);
  return (
    <section className="border-b border-line bg-panel">
      <div className="public-storefront-shell grid gap-10 px-4 py-14 md:grid-cols-[0.95fr_1.05fr] md:px-6 md:py-20">
        <div className="flex min-w-0 flex-col justify-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-strong">
            Sobre
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">
            {readString(theme.aboutTitle) ?? data.settings.store.name}
          </h2>
          <p className="mt-5 max-w-2xl whitespace-pre-wrap text-base font-medium leading-8 text-muted">
            {readString(theme.aboutText) ??
              "Atendimento direto, estoque selecionado e canais oficiais para uma compra mais tranquila."}
          </p>
        </div>
        {imageUrl ? (
          <img
            alt=""
            className="aspect-[4/3] w-full rounded-[1.5rem] object-cover shadow-[0_24px_70px_rgb(15_23_42_/_0.12)]"
            src={imageUrl}
          />
        ) : (
          <div className="grid aspect-[4/3] place-items-center rounded-[1.5rem] bg-app text-muted">
            <UserRound aria-hidden="true" className="size-10" />
          </div>
        )}
      </div>
    </section>
  );
}

export function TestimonialsSection({
  theme,
}: {
  theme: Record<string, unknown>;
}) {
  const testimonials = readTestimonials(theme.testimonials);
  if (!testimonials.length) return null;
  return (
    <section className="border-b border-line bg-app">
      <div className="public-storefront-shell px-4 py-14 md:px-6 md:py-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-strong">
          Depoimentos
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">
          Clientes atendidos
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {testimonials.map((testimonial) => (
            <article
              className="public-editorial-card rounded-[1.5rem] p-6 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_24px_70px_rgb(15_23_42_/_0.1)]"
              key={testimonial.id}
            >
              <Star aria-hidden="true" className="size-5 text-accent" />
              <p className="mt-4 text-base font-medium leading-8 text-muted">
                "{testimonial.quote}"
              </p>
              <strong className="mt-4 block font-semibold text-app-text">
                {testimonial.name}
              </strong>
              <span className="text-sm font-medium text-muted">
                {testimonial.role}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function BrandMark({
  logoUrl,
  photoUrl,
}: {
  logoUrl: string | null;
  photoUrl: string | null;
}) {
  const imageUrl = logoUrl ?? photoUrl;
  if (imageUrl) {
    return (
      <img
        alt=""
        className="size-12 shrink-0 rounded-2xl border border-line bg-panel object-cover shadow-sm"
        src={imageUrl}
      />
    );
  }
  return (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent shadow-sm">
      <Sparkles aria-hidden="true" className="size-5" />
    </div>
  );
}

function createVisibleProofItems(
  sections: readonly VisibleStorefrontSection[],
) {
  const sectionTypes = new Set(sections.map((section) => section.type));
  return proofItems.filter((item) => {
    if (item.key === "featured") {
      return (
        sectionTypes.has("featured") ||
        sectionTypes.has("all_properties") ||
        sectionTypes.has("search")
      );
    }
    if (item.key === "financing") return sectionTypes.has("contact");
    return true;
  });
}
