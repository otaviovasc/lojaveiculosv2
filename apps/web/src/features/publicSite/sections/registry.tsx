import type { ComponentType } from "react";
import { HeroSection, StockSection } from "../PublicStorefrontSections";
import { LeadPanel } from "../PublicStorefrontLeadPanel";
import {
  AboutSection,
  TestimonialsSection,
} from "../PublicStorefrontSubsections";
import type { SectionType } from "../config/types";
import { StorefrontFooter } from "./StorefrontFooter";
import { StorefrontHeader } from "./StorefrontHeader";
import type { StorefrontSectionProps } from "./types";

export type StorefrontSectionDefinition = {
  component: ComponentType<StorefrontSectionProps>;
  defaultVariant: string;
  required: boolean;
  variants: readonly string[];
};

function AboutSectionEntry({ data }: StorefrontSectionProps) {
  return <AboutSection data={data} />;
}

function TestimonialsSectionEntry({ data }: StorefrontSectionProps) {
  return <TestimonialsSection theme={data.settings.site.theme} />;
}

function LeadPanelEntry({ copy, data }: StorefrontSectionProps) {
  return (
    <LeadPanel
      ctaLabel={copy.ctaLabel ?? "Tenho interesse"}
      settings={data.settings}
    />
  );
}

export const storefrontSectionRegistry: Record<
  SectionType,
  StorefrontSectionDefinition
> = {
  about: {
    component: AboutSectionEntry,
    defaultVariant: "standard",
    required: false,
    variants: ["standard"],
  },
  footer: {
    component: StorefrontFooter,
    defaultVariant: "standard",
    required: true,
    variants: ["standard"],
  },
  header: {
    component: StorefrontHeader,
    defaultVariant: "standard",
    required: true,
    variants: ["standard", "overlay", "opaque"],
  },
  hero: {
    component: HeroSection,
    defaultVariant: "standard",
    required: true,
    variants: ["standard", "fullscreen", "split"],
  },
  lead: {
    component: LeadPanelEntry,
    defaultVariant: "standard",
    required: false,
    variants: ["standard"],
  },
  stock: {
    component: StockSection,
    defaultVariant: "featured",
    required: false,
    variants: [
      "featured",
      "search",
      "all_properties",
      "featured-large",
      "grid-compact",
    ],
  },
  testimonials: {
    component: TestimonialsSectionEntry,
    defaultVariant: "standard",
    required: false,
    variants: ["standard"],
  },
};

export function resolveSectionVariant(
  definition: StorefrontSectionDefinition,
  variant: string,
) {
  return definition.variants.includes(variant)
    ? variant
    : definition.defaultVariant;
}
