export const storefrontBuilderComponentTypes = [
  "about",
  "contact_section",
  "container",
  "cta",
  "divider",
  "featured",
  "footer",
  "gallery",
  "header",
  "hero",
  "image",
  "map",
  "marquee",
  "properties_grid",
  "scroll_zoom",
  "section_wrapper",
  "spacer",
  "testimonials",
  "text_block",
  "two_column",
  "typewriter",
  "vehicle_specs",
  "video",
] as const;

export type StorefrontBuilderComponentType =
  (typeof storefrontBuilderComponentTypes)[number];

export type StorefrontBuilderBackground = {
  gradient?: {
    angle?: number;
    stops?: readonly { color: string; position: number }[];
    type?: "linear" | "radial";
  };
  imageUrl?: string | null;
  overlay?: {
    color?: string;
    enabled?: boolean;
    opacity?: number;
  };
  solidColor?: string;
  type: "gradient" | "image" | "solid" | "video";
  videoAutoplay?: boolean;
  videoLoop?: boolean;
  videoMuted?: boolean;
  videoUrl?: string | null;
};

export type StorefrontBuilderStyle = {
  animation?: string;
  animationDelay?: number;
  animationDuration?: number;
  background?: StorefrontBuilderBackground;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: string;
  borderWidth?: number;
  fontFamily?: string;
  fontSize?: string;
  margin?: string;
  maxHeight?: string;
  minHeight?: string;
  padding?: string;
  shadow?: string;
  textAlign?: "center" | "left" | "right";
  textColor?: string;
};

export type StorefrontBuilderComponent = {
  id: string;
  order: number;
  props: Record<string, unknown>;
  type: StorefrontBuilderComponentType | string;
  visible: boolean;
};

export type StorefrontPageChrome = {
  footerChromeTextColor?: string | null;
  footerExtraLine?: string | null;
  headerBgColor?: string | null;
  headerLinkColor?: string | null;
  headerVariant?: "glass" | "minimal" | "solid";
  showFooter?: boolean;
  showHeader?: boolean;
  showSiteLink?: boolean;
};

export type StorefrontBuilderSeo = {
  metaDescription?: string | null;
  metaTitle?: string | null;
  ogImageUrl?: string | null;
};

export type StorefrontCustomPage = {
  accentColor?: string | null;
  backgroundColor?: string | null;
  components: StorefrontBuilderComponent[];
  description?: string | null;
  fontFamily?: string | null;
  id: string;
  order: number;
  pageBackground?: StorefrontBuilderBackground | null;
  pageChrome?: StorefrontPageChrome | null;
  previewUrl?: string | null;
  publicUrl?: string | null;
  secretToken?: string | null;
  seo?: StorefrontBuilderSeo | null;
  slug: string;
  title: string;
  visible: boolean;
};

export type PublicStorefrontCustomPageStatus = {
  sitePublished: boolean;
};

export type StorefrontBuilderContact = {
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

export type StorefrontBuilderSocialLinks = {
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  whatsapp?: string | null;
  youtube?: string | null;
};

export type StorefrontBuilderConfig = {
  accentColor: string;
  backgroundColor: string;
  contact: StorefrontBuilderContact;
  fonts: {
    body: string;
    heading: string;
  };
  heroImageUrl?: string | null;
  logoUrl?: string | null;
  socialLinks: StorefrontBuilderSocialLinks;
  storeName: string;
  templateId: string;
};

export type StorefrontBuilderVehicle = {
  description?: string | null;
  id?: string;
  manufactureYear?: number | null;
  mileageKm?: number | null;
  modelYear?: number | null;
  priceCents?: number | null;
  slug: string;
  thumbnailUrl?: string | null;
  title: string;
};

export const defaultStorefrontBuilderConfig: StorefrontBuilderConfig = {
  accentColor: "#C9A84C",
  backgroundColor: "#F8F5F0",
  contact: {},
  fonts: {
    body: "Plus Jakarta Sans",
    heading: "Plus Jakarta Sans",
  },
  socialLinks: {},
  storeName: "Loja",
  templateId: "classic",
};

export function normalizeStorefrontPageSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
