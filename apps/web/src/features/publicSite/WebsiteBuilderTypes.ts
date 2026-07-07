import type { StoreSettingsSnapshot } from "../settings/types";

export type WebsiteBuilderTemplateId = "aurora" | "quadra";
export type WebsiteBuilderViewportMode = "desktop" | "mobile" | "tablet";

export type WebsiteBuilderSection = {
  id: string;
  order: number;
  type: string;
  visible: boolean;
};

export type WebsiteBuilderTestimonial = {
  id: string;
  imageSrc?: string | null;
  name: string;
  quote: string;
  role: string;
};

export type WebsiteBuilderConfig = {
  aboutImageUrl?: string | null;
  aboutText?: string | null;
  aboutTitle?: string | null;
  accentColor: string;
  backgroundColor: string;
  brandColor: string;
  contact: {
    address?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  corretorCreci?: string | null;
  corretorName?: string | null;
  corretorPhotoUrl?: string | null;
  faviconUrl?: string | null;
  fonts: {
    body?: string;
    heading?: string;
  };
  heroImageUrl?: string | null;
  heroSubtitle?: string | null;
  heroTitle: string;
  logoUrl?: string | null;
  sections: WebsiteBuilderSection[];
  seo: {
    metaDescription?: string | null;
    metaTitle?: string | null;
    ogImageUrl?: string | null;
  };
  socialLinks: {
    facebook?: string | null;
    instagram?: string | null;
    tiktok?: string | null;
    whatsapp?: string | null;
    youtube?: string | null;
  };
  templateId: WebsiteBuilderTemplateId;
  testimonials: WebsiteBuilderTestimonial[];
};

export type WebsiteBuilderSaveInput = {
  config: WebsiteBuilderConfig;
  settings: StoreSettingsSnapshot;
  templateId: WebsiteBuilderTemplateId;
};
