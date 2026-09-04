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

export type WebsiteBuilderAboutFeature = {
  description: string;
  title: string;
};

export type WebsiteBuilderHeroMediaSource = "auto" | "banners" | "vehicles";
export type WebsiteBuilderAppearanceMode = "both" | "dark" | "light";

export type WebsiteBuilderConfig = {
  aboutButtonText?: string | null;
  aboutCuradoriaText?: string | null;
  aboutFeatures: WebsiteBuilderAboutFeature[];
  aboutImage2Url?: string | null;
  aboutImageUrl?: string | null;
  aboutText?: string | null;
  aboutTitle?: string | null;
  aboutWhyText?: string | null;
  aboutWhyTitle?: string | null;
  accentColor: string;
  appearanceMode: WebsiteBuilderAppearanceMode;
  backgroundColor: string;
  brandColor: string;
  contact: {
    address?: string | null;
    businessHours?: string | null;
    description1?: string | null;
    description2?: string | null;
    email?: string | null;
    mapEmbedUrl?: string | null;
    phone?: string | null;
    phone2?: string | null;
    phone2Label?: string | null;
    phone3?: string | null;
    phone3Label?: string | null;
    phoneLabel?: string | null;
    showMap: boolean;
    title?: string | null;
  };
  corretorCreci?: string | null;
  corretorName?: string | null;
  corretorPhotoUrl?: string | null;
  faviconUrl?: string | null;
  footer: {
    cnpj?: string | null;
    extraInfo?: string | null;
  };
  fonts: {
    body?: string;
    heading?: string;
  };
  heroBannerUrls: string[];
  heroBannerMobileUrl?: string | null;
  heroImageUrl?: string | null;
  heroMediaSource: WebsiteBuilderHeroMediaSource;
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
