import { useMemo, useState } from "react";
import {
  PublicListingDetailPanel,
  type PublicListingDetailSnapshot,
} from "./PublicListingDetailPanel";
import {
  AboutSection,
  HeroSection,
  StockSection,
  TestimonialsSection,
} from "./PublicStorefrontSections";
import { LeadPanel } from "./PublicStorefrontLeadPanel";
import {
  createStorefrontTheme,
  normalizeStorefrontTemplateKey,
} from "./storefrontTemplates";
import { StorefrontFontLinks } from "./storefrontFonts";
import {
  createStorefrontStyle,
  createVisibleSections,
  readThemeFonts,
} from "./publicStorefrontTheme";
import type {
  PublicStorefrontData,
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
  PublicStorefrontSettingsData,
} from "./types";

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
  const [searchQuery, setSearchQuery] = useState("");
  const layoutKey = normalizeStorefrontTemplateKey(
    data.settings.site.layoutKey,
  );
  const rawTheme = data.settings.site.theme;
  const theme = createStorefrontTheme(rawTheme, layoutKey);
  const visibleSections = useMemo(
    () => createVisibleSections(rawTheme.sections, theme.sections),
    [rawTheme.sections, theme.sections],
  );
  const fonts = readThemeFonts(rawTheme);
  const style = createStorefrontStyle(rawTheme, fonts);

  return (
    <>
      <StorefrontFontLinks fonts={[fonts.body, fonts.heading]} />
      <main
        className="public-light-surface public-storefront min-h-screen w-full"
        data-layout={layoutKey}
        style={style}
      >
        {visibleSections.map((section) => {
          if (section.type === "hero") {
            return (
              <HeroSection
                data={data}
                key={section.id}
                sections={visibleSections}
                theme={theme}
              />
            );
          }
          if (isStockSection(section.type)) {
            return (
              <StockSection
                key={section.id}
                listings={data.listings}
                onOpenListing={onOpenListing}
                query={searchQuery}
                sectionType={section.type}
                setQuery={setSearchQuery}
              />
            );
          }
          if (section.type === "about") {
            return <AboutSection data={data} key={section.id} />;
          }
          if (section.type === "testimonials") {
            return <TestimonialsSection key={section.id} theme={rawTheme} />;
          }
          if (section.type === "contact") {
            return (
              <LeadPanel
                ctaLabel={theme.ctaLabel}
                key={section.id}
                settings={data.settings}
              />
            );
          }
          return null;
        })}

        {detail.listingSlug ? (
          <PublicListingDetailPanel
            detail={detail}
            onClose={onCloseListing}
            onRetry={onRetryListing}
            onSubmitInterest={onSubmitListingInterest}
          />
        ) : null}
      </main>
    </>
  );
}

function isStockSection(type: string) {
  return type === "featured" || type === "search" || type === "all_properties";
}
