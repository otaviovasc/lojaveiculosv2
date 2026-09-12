import { MessageCircle, Phone } from "lucide-react";
import { PublicStorefrontHeroMedia } from "./PublicStorefrontHeroMedia";
import { readString } from "./publicStorefrontTheme";
import { createPhoneHref } from "./PublicListingDetailParts";
import type { StorefrontSectionProps } from "./sections/types";

/**
 * Split hero (Quadra): compact lead/contact panel on the left, vivid hero
 * media on the right. Editorial light surface — no full-bleed, no scrim.
 */
export function SplitHeroSection({
  copy,
  data,
  tokens,
}: StorefrontSectionProps) {
  const rawTheme = data.settings.site.theme;
  const heroSubtitle =
    readString(rawTheme.heroSubtitle) ?? data.settings.site.seoDescription;
  const brandName = tokens.brand.displayName ?? data.settings.store.name;
  const whatsappUrl = data.settings.contact.whatsappUrl;
  const phoneHref = createPhoneHref(
    data.settings.contact.contactPhone ?? data.settings.contact.whatsappPhone,
  );

  return (
    <section className="border-b border-line bg-app">
      <div className="public-storefront-shell grid items-center gap-[var(--sf-card-gap)] px-6 py-[var(--sf-section-pad)] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[var(--sf-radius)] border border-line bg-panel p-6 shadow-sm md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-accent-strong">
            {copy.badgeLabel || "Estoque atualizado"}
          </p>
          <h1 className="mt-2 text-[length:var(--sf-headline-size)] font-extrabold leading-[1.08] tracking-tight text-app-text">
            {copy.headline}
          </h1>
          {heroSubtitle ? (
            <p className="mt-4 text-sm font-medium leading-relaxed text-muted md:text-base">
              {heroSubtitle}
            </p>
          ) : null}

          <div className="mt-6 grid gap-3 text-sm font-semibold text-muted">
            <span className="flex items-center gap-2 rounded-[var(--sf-radius)] border border-line/60 bg-app p-3">
              {brandName}
            </span>
            {phoneHref ? (
              <a
                className="flex items-center gap-2 rounded-[var(--sf-radius)] border border-line/60 bg-app p-3 transition-colors hover:text-accent-text"
                href={phoneHref}
              >
                <Phone aria-hidden="true" className="size-4 text-accent" />
                {data.settings.contact.contactPhone ??
                  data.settings.contact.whatsappPhone}
              </a>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {whatsappUrl ? (
              <a
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--sf-radius)] bg-accent px-6 text-sm font-bold text-accent-foreground transition-all duration-[var(--sf-motion-micro)] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-95"
                href={whatsappUrl}
                rel="noreferrer"
                target="_blank"
              >
                <MessageCircle aria-hidden="true" className="size-4" />
                {copy.ctaLabel}
              </a>
            ) : null}
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--sf-radius)] border border-line bg-app px-6 text-sm font-bold text-app-text transition-colors duration-[var(--sf-motion-micro)] hover:border-accent/40"
              href="#estoque"
            >
              Ver estoque
            </a>
          </div>
        </div>

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--sf-radius)] border border-line bg-app-elevated shadow-lg">
          <PublicStorefrontHeroMedia
            emptyClassName="bg-app-elevated"
            heroImageUrl={data.settings.site.heroImageUrl}
            listings={data.listings}
            mediaClassName=""
            theme={rawTheme}
          />
        </div>
      </div>
    </section>
  );
}
