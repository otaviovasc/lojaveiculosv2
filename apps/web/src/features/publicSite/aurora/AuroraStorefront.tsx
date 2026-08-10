import { useMemo, useState } from "react";
import type { SectionSpec, StorefrontConfig } from "../config/types";
import { searchListings } from "../publicStorefrontTheme";
import type { PublicStorefrontPageData } from "../types";
import { adaptQuadraStorefront } from "../quadra/quadraAdapter";
import { AuroraHeader } from "./AuroraHeader";
import { AuroraHero } from "./AuroraHero";
import { AuroraInventory } from "./AuroraInventory";
import {
  AuroraAbout,
  AuroraContact,
  AuroraFooter,
  AuroraTestimonials,
} from "./AuroraSections";

type AuroraStorefrontProps = {
  config: StorefrontConfig;
  data: PublicStorefrontPageData;
  onOpenListing: (listingSlug: string) => void;
};

export function AuroraStorefront({
  config,
  data,
  onOpenListing,
}: AuroraStorefrontProps) {
  const [query, setQuery] = useState("");
  const model = useMemo(() => adaptQuadraStorefront(data), [data]);
  const sections = useMemo(
    () => normalizeSections(config.sections, model.testimonials.length > 0),
    [config.sections, model.testimonials.length],
  );
  const visibleTypes = useMemo(
    () => new Set(sections.map((section) => section.type)),
    [sections],
  );
  const listings = useMemo(
    () => searchListings(data.listings, query),
    [data.listings, query],
  );

  return (
    <div className="aurora-modern">
      {visibleTypes.has("header") ? (
        <AuroraHeader model={model} visibleSections={visibleTypes} />
      ) : null}
      <main>
        {sections.map((section) => {
          switch (section.type) {
            case "header":
            case "footer":
              return null;
            case "hero":
              return (
                <AuroraHero
                  key={section.id}
                  listingCount={data.listings.length}
                  model={model}
                  onSearch={setQuery}
                  query={query}
                />
              );
            case "stock":
              return (
                <AuroraInventory
                  key={section.id}
                  listings={listings}
                  onOpenListing={onOpenListing}
                  query={query}
                />
              );
            case "testimonials":
              return <AuroraTestimonials key={section.id} model={model} />;
            case "about":
              return <AuroraAbout key={section.id} model={model} />;
            case "lead":
              return <AuroraContact key={section.id} model={model} />;
            default:
              return null;
          }
        })}
      </main>
      {visibleTypes.has("footer") ? <AuroraFooter model={model} /> : null}
    </div>
  );
}

function normalizeSections(
  source: readonly SectionSpec[],
  hasTestimonials: boolean,
) {
  let sections = source.filter((section) => section.visible);
  if (!sections.some((section) => section.type === "stock")) {
    const heroIndex = sections.findIndex((section) => section.type === "hero");
    const at = heroIndex < 0 ? 0 : heroIndex + 1;
    sections = [
      ...sections.slice(0, at),
      {
        id: "aurora-inventory",
        type: "stock",
        variant: "editorial",
        visible: true,
      },
      ...sections.slice(at),
    ];
  }
  if (
    hasTestimonials &&
    !sections.some((section) => section.type === "testimonials")
  ) {
    const stockIndex = sections.findIndex(
      (section) => section.type === "stock",
    );
    const at = stockIndex < 0 ? sections.length : stockIndex + 1;
    sections = [
      ...sections.slice(0, at),
      {
        id: "aurora-testimonials",
        type: "testimonials",
        variant: "editorial",
        visible: true,
      },
      ...sections.slice(at),
    ];
  }
  const seen = new Set<SectionSpec["type"]>();
  return sections.filter((section) => {
    if (seen.has(section.type)) return false;
    seen.add(section.type);
    return true;
  });
}
