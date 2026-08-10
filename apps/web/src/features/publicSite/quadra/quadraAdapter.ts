import type {
  PublicStorefrontPageData,
  PublicVehicleListing,
  PublicVehicleMedia,
} from "../types";
import { resolvePublicStorefrontHeroMedia } from "../PublicStorefrontHeroMedia";

export type QuadraFeature = { description: string; title: string };

export type QuadraTestimonial = {
  id: string;
  imageUrl: string | null;
  name: string;
  quote: string;
  role: string;
};

export type QuadraStorefrontModel = {
  about: {
    description: string;
    features: readonly QuadraFeature[];
    title: string;
    visualSubtitle: string;
    visualTitle: string;
    whyText: string;
    whyTitle: string;
  };
  contact: {
    address: string | null;
    businessHours: string | null;
    description1: string;
    description2: string;
    email: string | null;
    instagramUrl: string | null;
    mapEmbedUrl: string | null;
    phone: string | null;
    title: string;
    whatsappUrl: string | null;
  };
  hero: {
    autoplay: boolean;
    bannerUrls: readonly string[];
    imageKind: "image" | "video";
    imageUrl: string | null;
    mediaSource: "auto" | "banners" | "vehicles";
    speed: number;
    subtitle: string;
    title: string;
  };
  logoUrl: string | null;
  logoWidth: number;
  storeName: string;
  testimonials: readonly QuadraTestimonial[];
};

const defaultFeatures: readonly QuadraFeature[] = [
  { description: "Carros, motos e SUVs", title: "Veículos bem Cuidados" },
  {
    description: "Segurança em cada negociação",
    title: "Garantia Total",
  },
  {
    description: "Atendimento personalizado",
    title: "Equipe Especializada",
  },
  { description: "Tradição em bons negócios", title: "Desde 2023" },
];

export function adaptQuadraStorefront(
  data: PublicStorefrontPageData,
): QuadraStorefrontModel {
  const theme = record(data.settings.site.theme);
  const about = record(theme.about);
  const contact = record(theme.contact);
  const contactExtras = record(theme.contact_extras);
  const legacySettings = record(theme.settings);
  const socialLinks = record(theme.socialLinks);
  const testimonials = Array.isArray(theme.testimonials)
    ? theme.testimonials.flatMap(readTestimonial)
    : [];
  const configuredFeatures = Array.isArray(about.features)
    ? about.features.flatMap(readFeature)
    : [];
  const heroBannerUrls = firstStrings(theme.heroBannerUrls, theme.hero_banners);
  const heroImageUrl =
    data.settings.site.heroImageUrl ?? text(theme.hero_image_url);
  const heroMediaSource =
    theme.hero_template === "banner"
      ? "banners"
      : readMediaSource(theme.heroMediaSource);
  const heroMedia = resolvePublicStorefrontHeroMedia({
    heroImageUrl,
    listings: data.listings,
    theme: {
      ...theme,
      heroBannerUrls,
      heroMediaSource,
    },
  });
  const primaryHeroMedia = heroMedia[0] ?? null;

  return {
    about: {
      description:
        text(theme.aboutText) ??
        text(about.description) ??
        "Especialistas em conectar você aos melhores negócios em veículos. Encontre o carro dos seus sonhos com as condições mais vantajosas do mercado.",
      features: configuredFeatures.length
        ? configuredFeatures
        : defaultFeatures,
      title: text(theme.aboutTitle) ?? text(about.title) ?? "Sobre Nós",
      visualSubtitle: text(about.visual_subtitle) ?? "Carros, motos e SUVs",
      visualTitle: text(about.visual_title) ?? "Do Clássico ao Moderno",
      whyText:
        text(about.why_text) ??
        "Combinamos experiência e atendimento personalizado para garantir que você encontre exatamente o que procura, com total segurança.",
      whyTitle: text(about.why_title) ?? "Por Que Escolher a Gente?",
    },
    contact: {
      address:
        formatProfileAddress(data.settings.contact) ??
        text(contact.address) ??
        text(contactExtras.address_full) ??
        data.settings.contact.city,
      businessHours:
        formatBusinessHours(data.settings.contact.businessHours) ??
        text(contact.businessHours) ??
        text(theme.businessHours) ??
        text(theme.business_hours) ??
        text(legacySettings.business_hours),
      description1:
        text(contact.description1) ??
        text(contactExtras.description1) ??
        "Entre em contato conosco para obter mais informações sobre nossos veículos e serviços.",
      description2:
        text(contact.description2) ??
        text(contactExtras.description2) ??
        "Estamos sempre prontos para ajudar você a encontrar o veículo ideal. Fale conosco através dos nossos canais oficiais.",
      email: text(contact.email) ?? data.settings.contact.contactEmail,
      instagramUrl:
        text(socialLinks.instagram) ??
        text(theme.instagram_url) ??
        text(legacySettings.instagram_url),
      mapEmbedUrl: text(theme.mapEmbedUrl) ?? text(theme.map_embed_url),
      phone:
        data.settings.contact.whatsappPhone ??
        data.settings.contact.contactPhone ??
        text(theme.whatsapp_number) ??
        text(legacySettings.whatsapp_number) ??
        text(contact.phone),
      title: text(contact.title) ?? text(contactExtras.title) ?? "Contato",
      whatsappUrl: data.settings.contact.whatsappUrl,
    },
    hero: {
      autoplay:
        typeof theme.hero_banner_autoplay === "boolean"
          ? theme.hero_banner_autoplay
          : true,
      bannerUrls:
        heroMediaSource !== "vehicles" && heroBannerUrls.length
          ? heroBannerUrls
          : [],
      imageKind: primaryHeroMedia?.kind ?? "image",
      imageUrl: primaryHeroMedia?.url ?? null,
      mediaSource: heroMediaSource,
      speed: positiveNumber(theme.hero_banner_speed) ?? 4000,
      subtitle:
        text(theme.heroSubtitle) ??
        text(theme.hero_subtitle) ??
        data.settings.site.seoDescription ??
        `Encontre o veículo dos seus sonhos em ${data.settings.store.name}`,
      title:
        text(theme.heroTitle) ??
        text(theme.texto_cabecalho_ofertas) ??
        text(theme.headline) ??
        "Nossas **Ofertas**",
    },
    logoUrl: text(theme.logoUrl) ?? text(theme.logo_url),
    logoWidth: positiveNumber(theme.logoWidth ?? theme.logo_width) ?? 130,
    storeName: text(theme.corretorName) ?? data.settings.store.name,
    testimonials,
  };
}

export function quadraListingMedia(
  listing: PublicVehicleListing,
): readonly PublicVehicleMedia[] {
  const withMedia = listing as PublicVehicleListing & {
    media?: readonly PublicVehicleMedia[];
  };
  const candidates = [
    ...(withMedia.media ?? []).filter((item) => item.kind === "photo"),
    ...(listing.heroMedia?.kind === "photo" ? [listing.heroMedia] : []),
  ];
  const seen = new Set<string>();
  const media = candidates.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
  if (listing.thumbnailUrl && !seen.has(listing.thumbnailUrl)) {
    media.push({
      altText: listing.title,
      displayOrder: media.length,
      kind: "photo",
      unitColorName: null,
      unitId: listing.slug,
      url: listing.thumbnailUrl,
    });
  }
  return media;
}

function readFeature(value: unknown): QuadraFeature[] {
  const item = record(value);
  const title = text(item.title);
  const description = text(item.description);
  return title && description ? [{ description, title }] : [];
}

function readTestimonial(value: unknown): QuadraTestimonial[] {
  const item = record(value);
  const id = scalarText(item.id);
  const name = text(item.name) ?? text(item.titulo);
  const quote = text(item.quote) ?? text(item.descricao);
  if (!id || !name || !quote) return [];
  return [
    {
      id,
      imageUrl: text(item.imageSrc) ?? text(item.imagem_url),
      name,
      quote,
      role: text(item.role) ?? text(item.cargo) ?? "Cliente",
    },
  ];
}

function readMediaSource(value: unknown) {
  return value === "banners" || value === "vehicles" ? value : "auto";
}

function formatProfileAddress(
  contact: PublicStorefrontPageData["settings"]["contact"],
): string | null {
  const street = [contact.addressLine1, contact.addressLine2]
    .filter(isText)
    .join(", ");
  const cityAndState = [contact.addressCity, contact.addressState]
    .filter(isText)
    .join(" - ");
  const parts = [street, cityAndState, contact.addressZipCode].filter(isText);
  return parts.length ? parts.join(", ") : null;
}

function formatBusinessHours(value: Record<string, unknown>): string | null {
  const configuredText = text(value.text);
  if (configuredText) return configuredText;
  const lines = Array.isArray(value.lines)
    ? value.lines.filter(isText).join("\n")
    : businessDayLines(value).join("\n");
  return text(lines);
}

function businessDayLines(value: Record<string, unknown>): string[] {
  return Object.entries(businessDayLabels).flatMap(([key, label]) => {
    const schedule = value[key];
    if (isText(schedule)) return [`${label}: ${schedule.trim()}`];
    const range = record(schedule);
    const open = text(range.open);
    const close = text(range.close);
    return open && close ? [`${label}: ${open} - ${close}`] : [];
  });
}

const businessDayLabels: Record<string, string> = {
  friday: "Sexta",
  monday: "Segunda",
  saturday: "Sabado",
  sunday: "Domingo",
  thursday: "Quinta",
  tuesday: "Terca",
  wednesday: "Quarta",
};

function isText(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((item) => (text(item) ? [text(item)!] : []))
    : [];
}

function firstStrings(...values: unknown[]) {
  for (const value of values) {
    const result = strings(value);
    if (result.length) return result;
  }
  return [];
}

function positiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function scalarText(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : text(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
