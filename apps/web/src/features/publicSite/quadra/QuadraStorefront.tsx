import { useMemo } from "react";
import type { SectionSpec, StorefrontConfig } from "../config/types";
import type {
  PublicStorefrontLeadInput,
  PublicStorefrontLeadResult,
  PublicStorefrontPageData,
} from "../types";
import { QuadraAbout } from "./QuadraAbout";
import { adaptQuadraStorefront } from "./quadraAdapter";
import { QuadraCars } from "./QuadraCars";
import { QuadraContact } from "./QuadraContact";
import { QuadraFooter } from "./QuadraFooter";
import { QuadraHeader } from "./QuadraHeader";
import { QuadraHero } from "./QuadraHero";
import { QuadraTestimonials } from "./QuadraTestimonials";
import { QuadraWhatsAppButton } from "./QuadraWhatsAppButton";

type QuadraStorefrontProps = {
  config: StorefrontConfig;
  data: PublicStorefrontPageData;
  onOpenListing: (listingSlug: string) => void;
  onSubmitStorefrontInterest: (
    input: PublicStorefrontLeadInput,
  ) => Promise<PublicStorefrontLeadResult>;
};

export function QuadraStorefront({
  config,
  data,
  onOpenListing,
  onSubmitStorefrontInterest,
}: QuadraStorefrontProps) {
  const model = useMemo(() => adaptQuadraStorefront(data), [data]);
  const sections = useMemo(
    () =>
      dedupeVisibleSections(
        ensureTestimonialsSection(
          ensureStockSection(config.sections),
          model.testimonials.length > 0,
        ).filter((section) => section.visible),
      ),
    [config.sections, model.testimonials.length],
  );
  const visibleTypes = useMemo(
    () => new Set(sections.map((section) => section.type)),
    [sections],
  );
  return (
    <>
      {visibleTypes.has("header") ? (
        <QuadraHeader model={model} visibleSections={visibleTypes} />
      ) : null}

      <main className="quadra-modern__main">
        {sections.map((section) => {
          switch (section.type) {
            case "header":
            case "footer":
              return null;
            case "hero":
              return (
                <QuadraHero
                  key={section.id}
                  model={model}
                  onOpenListing={onOpenListing}
                />
              );
            case "stock":
              return (
                <QuadraCars
                  key={section.id}
                  listings={data.listings}
                  onOpenListing={onOpenListing}
                />
              );
            case "testimonials":
              return <QuadraTestimonials key={section.id} model={model} />;
            case "about":
              return <QuadraAbout key={section.id} model={model} />;
            case "lead":
              return (
                <QuadraContact
                  key={section.id}
                  model={model}
                  onSubmitInterest={onSubmitStorefrontInterest}
                />
              );
          }
        })}
      </main>

      {visibleTypes.has("footer") ? <QuadraFooter model={model} /> : null}
      <QuadraWhatsAppButton model={model} />
    </>
  );
}

function ensureStockSection(sections: readonly SectionSpec[]) {
  if (sections.some((section) => section.type === "stock")) return sections;
  const heroIndex = sections.findIndex((section) => section.type === "hero");
  const insertionIndex = heroIndex < 0 ? 0 : heroIndex + 1;
  return [
    ...sections.slice(0, insertionIndex),
    {
      id: "quadra-all-listings",
      type: "stock" as const,
      variant: "grid-compact",
      visible: true,
    },
    ...sections.slice(insertionIndex),
  ];
}

function dedupeVisibleSections(sections: readonly SectionSpec[]) {
  const seen = new Set<SectionSpec["type"]>();
  return sections.filter((section) => {
    if (seen.has(section.type)) return false;
    seen.add(section.type);
    return true;
  });
}

function ensureTestimonialsSection(
  sections: readonly SectionSpec[],
  hasTestimonials: boolean,
) {
  if (
    !hasTestimonials ||
    sections.some((section) => section.type === "testimonials")
  )
    return sections;
  const stockIndex = sections.findIndex((section) => section.type === "stock");
  const insertionIndex = stockIndex < 0 ? 0 : stockIndex + 1;
  return [
    ...sections.slice(0, insertionIndex),
    {
      id: "quadra-testimonials",
      type: "testimonials" as const,
      variant: "standard",
      visible: true,
    },
    ...sections.slice(insertionIndex),
  ];
}
