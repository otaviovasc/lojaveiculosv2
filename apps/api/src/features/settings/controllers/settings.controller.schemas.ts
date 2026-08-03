import { z } from "zod";

const nullableText = (max: number) =>
  z.string().trim().max(max).nullable().optional();

const recordSchema = z.record(z.string(), z.unknown());

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/)
  .nullable()
  .optional();

const urlText = nullableText(2048);

const themeSectionSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    order: z.number().int().optional(),
    type: z.string().trim().min(1).max(40),
    variant: z.string().trim().max(40).optional(),
    visible: z.boolean(),
  })
  .strict();

const themeSectionsSchema = z.array(
  z.union([z.string().trim().min(1).max(40), themeSectionSchema]),
);

const themeTokensSchema = z.object({
  brand: z
    .object({
      displayLine: nullableText(120),
      displayName: nullableText(120),
      faviconUrl: urlText,
      logoUrl: urlText,
      photoUrl: urlText,
    })
    .optional(),
  color: z
    .object({
      accent: hexColorSchema,
      accentStrong: hexColorSchema,
      chrome: z.enum(["brand", "dark", "light"]).optional(),
      ink: hexColorSchema,
      inkMuted: hexColorSchema,
      surface: hexColorSchema,
      surfaceRaised: hexColorSchema,
    })
    .optional(),
  motion: z
    .object({
      style: z.enum(["dynamic", "none", "subtle"]).optional(),
    })
    .optional(),
  shape: z
    .object({
      density: z.enum(["airy", "default", "dense"]).optional(),
      radius: z.enum(["pill", "rounded", "sharp"]).optional(),
    })
    .optional(),
  type: z
    .object({
      bodyFont: nullableText(120),
      headingFont: nullableText(120),
      scale: z.enum(["compact", "display", "standard"]).optional(),
    })
    .optional(),
});

const themeCopySchema = z.record(
  z.string(),
  z.record(z.string(), z.string().max(500)),
);

const themeTestimonialSchema = z.object({
  id: z.string().trim().min(1).max(80),
  imageSrc: urlText,
  name: z.string().trim().max(120),
  quote: z.string().trim().max(500),
  role: z.string().trim().max(120),
});

export const publicSiteThemeSchema = z
  .object({
    aboutImageUrl: urlText,
    aboutText: nullableText(500),
    aboutTitle: nullableText(120),
    accentColor: hexColorSchema,
    backgroundColor: hexColorSchema,
    badgeLabel: nullableText(120),
    bodyFont: nullableText(120),
    brandColor: hexColorSchema,
    configVersion: z.literal(1).optional(),
    contact: z
      .object({
        address: nullableText(191),
        email: nullableText(191),
        phone: nullableText(40),
      })
      .optional(),
    copy: themeCopySchema.optional(),
    corretorCreci: nullableText(120),
    corretorName: nullableText(120),
    corretorPhotoUrl: urlText,
    ctaLabel: nullableText(120),
    favicon_url: urlText,
    faviconUrl: urlText,
    fonts: z
      .object({
        body: nullableText(120),
        heading: nullableText(120),
      })
      .optional(),
    headingFont: nullableText(120),
    headline: nullableText(120),
    heroBannerUrls: z.array(z.string().trim().max(2048)).optional(),
    heroImageUrl: urlText,
    heroMediaSource: z.enum(["auto", "banners", "vehicles"]).optional(),
    heroSubtitle: nullableText(500),
    heroTitle: nullableText(120),
    logo_icon_url: urlText,
    logoIconUrl: urlText,
    logoUrl: urlText,
    preset: z.enum(["aurora", "quadra"]).optional(),
    sections: themeSectionsSchema.optional(),
    seo: z
      .object({
        metaDescription: nullableText(500),
        metaTitle: nullableText(120),
        ogImageUrl: urlText,
      })
      .optional(),
    socialLinks: z
      .object({
        facebook: urlText,
        instagram: urlText,
        tiktok: urlText,
        whatsapp: nullableText(40),
        youtube: urlText,
      })
      .optional(),
    templateId: z.string().trim().max(80).optional(),
    testimonials: z.array(themeTestimonialSchema).optional(),
    tokens: themeTokensSchema.optional(),
  })
  .strict();

export function normalizeStorefrontLayoutKey(
  layoutKey: string,
): "aurora" | "quadra" {
  if (
    layoutKey === "quadra" ||
    layoutKey === "showroom" ||
    layoutKey === "classic"
  ) {
    return "quadra";
  }
  return "aurora";
}

export const updateStoreSettingsSchema = z.object({
  identity: z
    .object({
      legalName: nullableText(191),
      primaryDomain: nullableText(191),
      publicSlug: z.string().trim().max(80).optional(),
      tradingName: z.string().trim().min(1).max(191).optional(),
    })
    .optional(),
  profile: z
    .object({
      addressCity: nullableText(120),
      addressLine1: nullableText(191),
      addressLine2: nullableText(191),
      addressState: nullableText(80),
      addressZipCode: nullableText(32),
      businessHours: recordSchema.optional(),
      contactEmail: z.string().email().nullable().optional(),
      contactPhone: nullableText(40),
      documentNumber: nullableText(32),
      logoImageUrl: z.string().url().nullable().optional(),
      whatsappPhone: nullableText(40),
    })
    .optional(),
  publicSite: z
    .object({
      customDomain: nullableText(191),
      heroImageUrl: z.string().url().nullable().optional(),
      isPublished: z.boolean().optional(),
      layoutKey: z
        .string()
        .trim()
        .min(1)
        .max(80)
        .transform(normalizeStorefrontLayoutKey)
        .optional(),
      seoDescription: nullableText(320),
      seoTitle: nullableText(191),
      theme: publicSiteThemeSchema.optional(),
    })
    .optional(),
});
