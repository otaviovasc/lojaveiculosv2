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
  { icon: CheckCircle2, key: "featured", label: "Estoque verificado" },
  { icon: ShieldCheck, key: "trust", label: "Dados do lojista" },
  { icon: MessageCircle, key: "financing", label: "Atendimento no WhatsApp" },
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
    <section className="relative overflow-hidden border-b border-line bg-[radial-gradient(circle_at_90%_15%,color-mix(in_oklab,var(--color-accent)_8%,transparent),transparent_40%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
      <div className="public-storefront-shell grid gap-8 px-4 py-8 md:px-6 md:py-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
        <div className="flex min-w-0 flex-col justify-center">
          <div className="max-w-2xl">
            <div className="mb-6 flex items-center gap-3">
              <BrandMark logoUrl={logoUrl} photoUrl={photoUrl} />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-accent">
                  {theme.badgeLabel || "DEALER EXCLUSIVO"}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold text-muted">
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

            <h1 className="max-w-3xl break-words text-4xl font-extrabold leading-[1.05] tracking-tight text-app-text sm:text-5xl lg:text-6xl">
              {theme.headline}
            </h1>

            {heroSubtitle && (
              <p className="mt-5 max-w-xl text-base font-medium leading-relaxed text-muted sm:text-lg">
                {heroSubtitle}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-8 text-sm font-bold text-inverse shadow-[0_8px_30px_color-mix(in_oklab,var(--color-accent)_20%,transparent)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_color-mix(in_oklab,var(--color-accent)_32%,transparent)] active:translate-y-0 active:scale-95"
                href="#estoque"
              >
                Ver estoque
              </a>
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-panel px-8 text-sm font-bold text-app-text shadow-[0_8px_20px_rgba(15,23,42,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)] active:translate-y-0 active:scale-95"
                href="#contato"
              >
                {theme.ctaLabel}
              </a>
            </div>
          </div>

          {visibleProofItems.length > 0 && (
            <div className="mt-8 grid gap-0 overflow-hidden rounded-2xl border border-line bg-panel/75 shadow-[0_8px_30px_rgba(15,23,42,0.02)] backdrop-blur sm:grid-cols-3">
              {visibleProofItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    className="flex min-h-16 items-center gap-3 border-b border-line/60 p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
                    key={item.label}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="text-xs font-bold text-app-text">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="group relative aspect-[16/11] w-full overflow-hidden rounded-[2rem] border border-line bg-accent-soft shadow-[0_20px_50px_rgba(15,23,42,0.08)] lg:aspect-auto lg:h-[28rem]">
          {data.settings.site.heroImageUrl ? (
            <img
              alt=""
              className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              src={data.settings.site.heroImageUrl}
            />
          ) : (
            <div className="grid size-full place-items-center text-accent/60">
              <Sparkles aria-hidden="true" className="size-12" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 rounded-2xl border border-line bg-panel/90 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-md">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted">
              ESTOQUE ATIVO
            </p>
            <p className="mt-0.5 text-base font-bold text-app-text">
              {data.listings.length} veículos publicados
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
      <div className="public-storefront-shell px-4 py-16 md:px-6 md:py-20">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-accent">
              {stockEyebrow(sectionType)}
            </p>
            <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl text-app-text">
              {stockTitle(sectionType)}
            </h2>
          </div>
          {isSearch && (
            <label className="relative block sm:w-80">
              <span className="sr-only">Buscar veículo</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted"
              />
              <input
                className="min-h-12 w-full rounded-full border border-line bg-panel pl-11 pr-4 text-sm font-semibold text-app-text outline-none shadow-[0_8px_20px_rgba(15,23,42,0.02)] transition-all focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
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
          <div className="rounded-2xl border border-dashed border-line bg-panel p-12 text-center text-sm font-semibold text-muted shadow-sm">
            Nenhum veículo encontrado.
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
      <div className="public-storefront-shell grid gap-10 px-4 py-16 md:grid-cols-2 md:px-6 md:py-20 lg:py-24">
        <div className="flex min-w-0 flex-col justify-center">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-accent">
            SOBRE NÓS
          </p>
          <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl text-app-text">
            {readString(theme.aboutTitle) ?? data.settings.store.name}
          </h2>
          <p className="mt-6 max-w-2xl whitespace-pre-wrap text-base font-medium leading-relaxed text-muted">
            {readString(theme.aboutText) ??
              "Atendimento direto, estoque selecionado e canais oficiais para uma compra mais tranquila."}
          </p>
        </div>
        {imageUrl ? (
          <div className="overflow-hidden rounded-[2rem] border border-line bg-app shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
            <img
              alt=""
              className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-[1.025]"
              src={imageUrl}
            />
          </div>
        ) : (
          <div className="grid aspect-[4/3] place-items-center rounded-[2rem] bg-app text-muted border border-line">
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
      <div className="public-storefront-shell px-4 py-16 md:px-6 md:py-20 lg:py-24">
        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-accent">
          DEPOIMENTOS
        </p>
        <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl text-app-text">
          A opinião de quem já comprou
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {testimonials.map((testimonial) => (
            <article
              className="public-editorial-card rounded-[2rem] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-accent/20 hover:shadow-[0_20px_40px_rgba(15,23,42,0.05)]"
              key={testimonial.id}
            >
              <div className="flex gap-1 text-accent">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    aria-hidden="true"
                    className="size-4 fill-current"
                  />
                ))}
              </div>
              <p className="mt-5 text-base font-semibold leading-relaxed text-app-text italic">
                "{testimonial.quote}"
              </p>
              <div className="mt-6 flex flex-col">
                <strong className="text-sm font-bold text-app-text">
                  {testimonial.name}
                </strong>
                <span className="text-xs font-semibold text-muted mt-0.5">
                  {testimonial.role}
                </span>
              </div>
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
  const img = logoUrl ?? photoUrl;
  return img ? (
    <img
      alt=""
      className="size-12 shrink-0 rounded-2xl border border-line bg-panel object-cover shadow-sm"
      src={img}
    />
  ) : (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent border border-line/20 shadow-sm">
      <Sparkles aria-hidden="true" className="size-5" />
    </div>
  );
}

function createVisibleProofItems(
  sections: readonly VisibleStorefrontSection[],
) {
  const types = new Set(sections.map((s) => s.type));
  return proofItems.filter((item) => {
    if (item.key === "featured")
      return (
        types.has("featured") ||
        types.has("all_properties") ||
        types.has("search")
      );
    if (item.key === "financing") return types.has("contact");
    return true;
  });
}
