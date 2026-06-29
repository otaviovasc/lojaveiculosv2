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
    <section className="public-storefront-hero overflow-hidden rounded-lg border border-line bg-panel shadow-[0_24px_80px_color-mix(in_oklab,var(--color-text)_12%,transparent)]">
      <div className="grid min-h-[34rem] lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex flex-col justify-between p-5 lg:p-8">
          <div>
            <div className="mb-8 flex items-start gap-3">
              <BrandMark logoUrl={logoUrl} photoUrl={photoUrl} />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-muted">
                  {theme.badgeLabel}
                </p>
                <h1 className="text-3xl font-black leading-tight md:text-5xl">
                  {theme.headline}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-widest text-muted">
                  <span>{brandName}</span>
                  {brandLine ? <span>{brandLine}</span> : null}
                  <span>{data.settings.store.publicUrl}</span>
                </div>
              </div>
            </div>

            {heroSubtitle ? (
              <p className="max-w-xl text-base font-bold leading-7 text-muted md:text-lg">
                {heroSubtitle}
              </p>
            ) : null}
          </div>

          {visibleProofItems.length ? (
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
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
          ) : null}
        </div>
        <div className="relative min-h-[22rem] overflow-hidden bg-accent-soft">
          {data.settings.site.heroImageUrl ? (
            <img
              alt=""
              className="size-full object-cover transition-transform duration-700 hover:scale-[1.03]"
              src={data.settings.site.heroImageUrl}
            />
          ) : (
            <div className="grid size-full place-items-center text-accent">
              <Sparkles aria-hidden="true" className="size-16" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-panel/70 via-transparent to-transparent" />
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
    <section className="grid gap-4" id="estoque">
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-muted">
            {stockEyebrow(sectionType)}
          </p>
          <h2 className="text-xl font-black">{stockTitle(sectionType)}</h2>
        </div>
        {isSearch ? (
          <label className="relative block sm:w-72">
            <span className="sr-only">Buscar veiculo</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            />
            <input
              className="min-h-11 w-full rounded-lg border border-line bg-app pl-10 pr-3 text-sm font-bold outline-none transition-shadow focus:shadow-[var(--shadow-focus)]"
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
        <div className="rounded-lg border border-dashed border-line bg-panel p-8 text-center text-sm font-bold text-muted">
          Nenhum veiculo encontrado.
        </div>
      )}
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
    <section className="grid gap-5 rounded-lg border border-line bg-panel p-5 shadow-sm md:grid-cols-2 lg:p-7">
      <div className="flex min-w-0 flex-col justify-center">
        <p className="text-xs font-black uppercase tracking-widest text-muted">
          Sobre
        </p>
        <h2 className="mt-2 text-2xl font-black">
          {readString(theme.aboutTitle) ?? data.settings.store.name}
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm font-bold leading-6 text-muted">
          {readString(theme.aboutText) ??
            "Atendimento direto, estoque selecionado e canais oficiais para uma compra mais tranquila."}
        </p>
      </div>
      {imageUrl ? (
        <img
          alt=""
          className="aspect-[4/3] w-full rounded-lg object-cover shadow-sm"
          src={imageUrl}
        />
      ) : (
        <div className="grid aspect-[4/3] place-items-center rounded-lg bg-app text-muted">
          <UserRound aria-hidden="true" className="size-10" />
        </div>
      )}
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
    <section className="rounded-lg border border-line bg-panel p-5 shadow-sm lg:p-7">
      <p className="text-xs font-black uppercase tracking-widest text-muted">
        Depoimentos
      </p>
      <h2 className="mt-2 text-2xl font-black">Clientes atendidos</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {testimonials.map((testimonial) => (
          <article
            className="rounded-lg border border-line bg-app p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_color-mix(in_oklab,var(--color-text)_10%,transparent)]"
            key={testimonial.id}
          >
            <Star aria-hidden="true" className="size-4 text-accent" />
            <p className="mt-3 text-sm font-bold leading-6 text-muted">
              "{testimonial.quote}"
            </p>
            <strong className="mt-3 block font-black">
              {testimonial.name}
            </strong>
            <span className="text-sm font-bold text-muted">
              {testimonial.role}
            </span>
          </article>
        ))}
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
        className="size-12 shrink-0 rounded-lg border border-line bg-app object-cover"
        src={imageUrl}
      />
    );
  }
  return (
    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
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
