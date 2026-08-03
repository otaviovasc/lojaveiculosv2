import { useMemo } from "react";
import {
  PublicListingDetailPanel,
  type PublicListingDetailSnapshot,
} from "./PublicListingDetailPanel";
import { normalizeStorefrontConfig } from "./config/normalizeStorefrontConfig";
import { resolveTokenVars } from "./config/resolveTokens";
import {
  resolveSectionVariant,
  storefrontSectionRegistry,
} from "./sections/registry";
import { StorefrontFontLinks } from "./storefrontFonts";
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
  const config = useMemo(
    () =>
      normalizeStorefrontConfig(
        data.settings.site.theme,
        data.settings.site.layoutKey,
      ),
    [data.settings.site.theme, data.settings.site.layoutKey],
  );
  const style = useMemo(() => resolveTokenVars(config.tokens), [config.tokens]);
  const visibleSections = config.sections.filter((section) => section.visible);

  return (
    <>
      <StorefrontFontLinks
        fonts={[config.tokens.type.bodyFont, config.tokens.type.headingFont]}
      />
      <div
        className="public-light-surface public-storefront min-h-screen w-full"
        data-motion={config.tokens.motion.style}
        data-preset={config.preset}
        data-storefront
        id="topo"
        style={style}
      >
        {detail.listingSlug ? (
          <PublicListingDetailPanel
            detail={detail}
            onClose={onCloseListing}
            onRetry={onRetryListing}
            onSubmitInterest={onSubmitListingInterest}
            settings={data.settings}
          />
        ) : (
          visibleSections.map((section) => {
            const definition = storefrontSectionRegistry[section.type];
            const StorefrontSection = definition.component;
            return (
              <StorefrontSection
                copy={config.copy[section.type]}
                data={data}
                key={section.id}
                onOpenListing={onOpenListing}
                sections={visibleSections}
                spec={{
                  ...section,
                  variant: resolveSectionVariant(definition, section.variant),
                }}
                tokens={config.tokens}
              />
            );
          })
        )}
      </div>
    </>
  );
}
