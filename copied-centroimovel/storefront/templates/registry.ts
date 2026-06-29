import type { StoreConfig } from "@centroimovel/types";
import type { ComponentType } from "react";

export interface TemplateProps {
  config: StoreConfig;
  properties: TemplateProperty[];
  slug: string;
  searchParams?: Record<string, string | string[] | undefined>;
}

export interface TemplateProperty {
  id: string;
  title: string;
  type: string;
  purpose: string;
  price: number;
  rentPrice: number | null;
  areaM2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpots: number | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  coverPhotoUrl: string | null;
  amenities: string[];
  featured: boolean;
  hidePrice: boolean;
}

type LazyTemplateComponent = () => Promise<{
  default: ComponentType<TemplateProps>;
}>;

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  component: LazyTemplateComponent;
  defaultConfig: Partial<StoreConfig>;
}

export const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = {
  aurora: {
    id: "aurora",
    name: "Aurora",
    description: "Elegante e refinado — ideal para imóveis de alto padrão",
    thumbnail: "/templates/aurora-thumb.png",
    component: () => import("./aurora/AuroraTemplate"),
    defaultConfig: {
      brandColor: "#1A1A1A",
      accentColor: "#C9A84C",
      backgroundColor: "#F8F5F0",
      fonts: { heading: "Bricolage Grotesque", body: "Plus Jakarta Sans" },
    },
  },
  quadra: {
    id: "quadra",
    name: "Quadra",
    description:
      "Moderno e acolhedor — perfeito para mostrar sua marca pessoal",
    thumbnail: "/templates/quadra-thumb.png",
    component: () => import("./quadra/QuadraTemplate"),
    defaultConfig: {
      brandColor: "#C4622D",
      accentColor: "#2D5A3D",
      backgroundColor: "#FFFCF7",
      fonts: { heading: "Bricolage Grotesque", body: "Plus Jakarta Sans" },
    },
  },
};

export function getTemplateDefinition(templateId: string): TemplateDefinition {
  return TEMPLATE_REGISTRY[templateId] ?? TEMPLATE_REGISTRY["aurora"]!;
}

export function getAllTemplates(): TemplateDefinition[] {
  return Object.values(TEMPLATE_REGISTRY);
}
