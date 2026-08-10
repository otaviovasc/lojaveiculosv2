import { useMemo } from "react";
import "./aurora/aurora.css";
import "./quadra/quadra.css";
import { AuroraStorefront } from "./aurora/AuroraStorefront";
import {
  PublicListingDetailPanel,
  type PublicListingDetailSnapshot,
} from "./PublicListingDetailPanel";
import { normalizeStorefrontConfig } from "./config/normalizeStorefrontConfig";
import { resolveTokenVars } from "./config/resolveTokens";
import { QuadraListingDetail } from "./quadra/QuadraListingDetail";
import { QuadraStorefront } from "./quadra/QuadraStorefront";
import {
  readStorefrontAppearanceMode,
  StorefrontThemeToggle,
  useStorefrontAppearance,
} from "./StorefrontAppearance";
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
  const appearanceMode = readStorefrontAppearanceMode(data.settings.site.theme);
  const appearance = useStorefrontAppearance({
    mode: appearanceMode,
    storeSlug: data.store.slug,
  });
  return (
    <>
      <StorefrontFontLinks
        fonts={[
          config.tokens.type.bodyFont,
          config.tokens.type.headingFont,
          config.preset === "quadra" ? "Titillium Web" : null,
        ]}
      />
      <div
        className="public-light-surface public-storefront min-h-screen w-full"
        data-color-scheme={appearance.scheme}
        data-quadra-classic={config.preset === "quadra" ? "true" : undefined}
        data-motion={config.tokens.motion.style}
        data-preset={config.preset}
        data-storefront
        id="topo"
        style={style}
      >
        {appearanceMode === "both" ? (
          <StorefrontThemeToggle
            onToggle={appearance.toggle}
            scheme={appearance.scheme}
          />
        ) : null}
        {detail.listingSlug ? (
          config.preset === "quadra" ? (
            <QuadraListingDetail
              availableListings={data.listings}
              detail={detail}
              onClose={onCloseListing}
              onOpenListing={onOpenListing}
              onRetry={onRetryListing}
              onSubmitInterest={onSubmitListingInterest}
              settings={data.settings}
            />
          ) : (
            <PublicListingDetailPanel
              detail={detail}
              onClose={onCloseListing}
              onRetry={onRetryListing}
              onSubmitInterest={onSubmitListingInterest}
              settings={data.settings}
            />
          )
        ) : config.preset === "quadra" ? (
          <QuadraStorefront
            config={config}
            data={data}
            onOpenListing={onOpenListing}
          />
        ) : (
          <AuroraStorefront
            config={config}
            data={data}
            onOpenListing={onOpenListing}
          />
        )}
      </div>
    </>
  );
}
