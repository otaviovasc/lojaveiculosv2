import { z } from "zod";
import { isSafeGoogleMapsUrl } from "./settings.controller.theme-url.js";

const nullableText = (max: number) =>
  z.string().trim().max(max).nullable().optional();
const urlText = nullableText(2048);
export const googleMapsUrlText = urlText.refine(
  (value) => value == null || isSafeGoogleMapsUrl(value),
  "A URL do mapa deve usar HTTPS e um domínio do Google Maps.",
);
export const themeAboutFeatureSchema = z
  .object({
    description: z.string().trim().max(500),
    title: z.string().trim().max(120),
  })
  .strict();
const legacyAboutSchema = z
  .object({
    button_text: nullableText(120),
    curadoria_text: nullableText(500),
    description: nullableText(500),
    features: z.array(themeAboutFeatureSchema).optional(),
    image1_url: urlText,
    image2_url: urlText,
    title: nullableText(120),
    visual_subtitle: nullableText(120),
    visual_title: nullableText(120),
    why_text: nullableText(500),
    why_title: nullableText(120),
  })
  .strict();
export const themeFooterSchema = z
  .object({
    cnpj: nullableText(32),
    extra_info: nullableText(500),
    extraInfo: nullableText(500),
  })
  .strict();
export const themeLeadFormSchema = z
  .object({ showOnLandingPage: z.boolean().optional() })
  .strict();
export const legacyLeadFormSchema = z
  .object({
    show_on_lp: z.boolean().optional(),
    show_on_vehicle: z.boolean().optional(),
  })
  .strict();
export const legacyContactFields = {
  business_hours: nullableText(500),
  instagram_url: urlText,
  whatsapp: nullableText(40),
  whatsapp_number: nullableText(40),
};
export const supportedLegacyThemeFields = {
  about: legacyAboutSchema.optional(),
  banner_button_text: nullableText(120),
  banner_mobile_url: urlText,
  banner_mode: z.boolean().optional(),
  banner_pc_url: urlText,
  banner_show_button: z.boolean().optional(),
  banner_show_text: z.boolean().optional(),
  businessHours: nullableText(500),
  contact_extras: z
    .object({
      address_full: nullableText(191),
      description1: nullableText(500),
      description2: nullableText(500),
      phone2: nullableText(40),
      phone2_label: nullableText(120),
      phone3: nullableText(40),
      phone3_label: nullableText(120),
      phone_label: nullableText(120),
      title: nullableText(160),
    })
    .strict()
    .optional(),
  cor_primaria: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/)
    .nullable()
    .optional(),
  default_vehicle_images: z
    .array(z.string().trim().max(2048).nullable())
    .optional(),
  hero_banner_autoplay: z.boolean().optional(),
  hero_banner_speed: z.number().int().min(500).max(60_000).optional(),
  hero_banners: z.array(z.string().trim().max(2048)).optional(),
  hero_image_url: urlText,
  hero_s3_key: nullableText(1024),
  hero_subtitle: nullableText(500),
  hero_template: z.enum(["default", "banner"]).optional(),
  landing_template: z.enum(["classic", "modern"]).optional(),
  layout: z
    .object({
      order: z
        .array(z.enum(["home", "cars", "depoimentos", "about", "contact"]))
        .optional(),
      visibility: z
        .object({
          about: z.boolean().optional(),
          cars: z.boolean().optional(),
          contact: z.boolean().optional(),
          depoimentos: z.boolean().optional(),
          home: z.boolean().optional(),
        })
        .strict()
        .optional(),
    })
    .strict()
    .optional(),
  lead_form: legacyLeadFormSchema.optional(),
  logo_height: z.number().nonnegative().max(1000).nullable().optional(),
  logo_s3_key: nullableText(1024),
  logo_url: urlText,
  logo_width: z.number().nonnegative().max(1000).nullable().optional(),
  map_embed_url: googleMapsUrlText,
  map_location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .strict()
    .nullable()
    .optional(),
  settings: z
    .object({
      business_hours: nullableText(500),
      cep: nullableText(32),
      cidade: nullableText(120),
      estado: nullableText(80),
      instagram_url: urlText,
      whatsapp_number: nullableText(40),
    })
    .strict()
    .optional(),
  show_fipe_thermometer: z.boolean().optional(),
  show_map: z.boolean().optional(),
  texto_cabecalho_ofertas: nullableText(120),
};
