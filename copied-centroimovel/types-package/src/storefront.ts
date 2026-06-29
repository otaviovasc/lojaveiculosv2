import { z } from "zod";

function cuid() {
  return "c_" + Math.random().toString(36).substring(2, 15);
}

// Preview viewport modes for builder
export const ViewportModeSchema = z.enum(["desktop", "tablet", "mobile"]);
export type ViewportMode = z.infer<typeof ViewportModeSchema>;

export const SectionTypeSchema = z.enum([
  "hero",
  "featured",
  "search",
  "all_properties",
  "about",
  "testimonials",
  "contact",
  "map",
  "cta",
]);
export type SectionType = z.infer<typeof SectionTypeSchema>;

export const SectionSchema = z.object({
  id: z.string(),
  type: SectionTypeSchema,
  visible: z.boolean().default(true),
  order: z.number().int().min(0),
});
export type Section = z.infer<typeof SectionSchema>;

export const SocialLinksSchema = z.object({
  whatsapp: z.string().optional().nullable(),
  instagram: z.string().url().optional().nullable(),
  facebook: z.string().url().optional().nullable(),
  youtube: z.string().url().optional().nullable(),
  tiktok: z.string().url().optional().nullable(),
});
export type SocialLinks = z.infer<typeof SocialLinksSchema>;

export const ContactInfoSchema = z.object({
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
});
export type ContactInfo = z.infer<typeof ContactInfoSchema>;

export const SeoSchema = z.object({
  metaTitle: z.string().max(70).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
  ogImageUrl: z.string().url().optional().nullable(),
});
export type Seo = z.infer<typeof SeoSchema>;

export const FontPairSchema = z.object({
  heading: z.string().default("Bricolage Grotesque"),
  body: z.string().default("Plus Jakarta Sans"),
});
export type FontPair = z.infer<typeof FontPairSchema>;

export const CustomRouteSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(50),
  content: z.string().max(10000),
  visible: z.boolean().default(true),
  order: z.number().int().min(0),
});
export type CustomRoute = z.infer<typeof CustomRouteSchema>;

export const CustomButtonSchema = z.object({
  label: z.string().min(1).max(30),
  url: z.string().url(),
  visible: z.boolean().default(true),
  style: z.enum(["primary", "secondary", "outline"]).default("primary"),
});
export type CustomButton = z.infer<typeof CustomButtonSchema>;

export const TestimonialSchema = z.object({
  id: z.string(),
  quote: z.string().max(500),
  name: z.string().max(100),
  role: z.string().max(100),
  imageSrc: z.string().url().optional().nullable(),
});
export type Testimonial = z.infer<typeof TestimonialSchema>;

export const StoreConfigSchema = z.object({
  templateId: z.string().default("aurora"),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#1A1A1A"),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#C9A84C"),
  backgroundColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#F8F5F0"),
  logoUrl: z.string().url().optional().nullable(),
  faviconUrl: z.string().url().optional().nullable(),
  heroTitle: z.string().max(80).default("Encontre o imóvel dos seus sonhos"),
  heroSubtitle: z.string().max(160).optional().nullable(),
  heroImageUrl: z.string().url().optional().nullable(),
  aboutTitle: z.string().max(80).optional().nullable(),
  aboutText: z.string().max(3000).optional().nullable(),
  aboutImageUrl: z.string().url().optional().nullable(),
  corretorName: z.string().max(80).optional().nullable(),
  corretorCreci: z.string().max(30).optional().nullable(),
  corretorPhotoUrl: z.string().url().optional().nullable(),
  testimonials: z.array(TestimonialSchema).default([]),
  sections: z.array(SectionSchema).default([
    { id: "hero", type: "hero", visible: true, order: 0 },
    { id: "featured", type: "featured", visible: true, order: 1 },
    { id: "about", type: "about", visible: true, order: 2 },
    { id: "testimonials", type: "testimonials", visible: false, order: 3 },
    { id: "contact", type: "contact", visible: true, order: 4 },
    { id: "search", type: "search", visible: false, order: 5 },
    { id: "all_properties", type: "all_properties", visible: false, order: 6 },
  ]),
  socialLinks: SocialLinksSchema.default({}),
  contact: ContactInfoSchema.default({}),
  seo: SeoSchema.default({}),
  fonts: FontPairSchema.default({}),
  customButtons: z.array(CustomButtonSchema).default([]),
});
export type StoreConfig = z.infer<typeof StoreConfigSchema>;

export const TEMPLATE_IDS = ["aurora", "quadra"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const TEMPLATE_INFO: Record<
  TemplateId,
  { name: string; description: string }
> = {
  aurora: {
    name: "Aurora",
    description: "Elegante e refinado — ideal para imóveis de alto padrão",
  },
  quadra: {
    name: "Quadra",
    description: "Moderno e acolhedor — perfeito para sua marca pessoal",
  },
};

// ============================================
// CUSTOM PAGES (Modular Page Builder)
// ============================================

// Gradient color stop
export const GradientStopSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  position: z.number().min(0).max(100),
});
export type GradientStop = z.infer<typeof GradientStopSchema>;

// Gradient configuration
export const GradientConfigSchema = z.object({
  type: z.enum(["linear", "radial"]).default("linear"),
  angle: z.number().min(0).max(360).default(180),
  stops: z.array(GradientStopSchema).default([
    { color: "#000000", position: 0 },
    { color: "#ffffff", position: 100 },
  ]),
});
export type GradientConfig = z.infer<typeof GradientConfigSchema>;

// Background overlay configuration
export const BackgroundOverlaySchema = z.object({
  enabled: z.boolean().default(false),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#000000"),
  opacity: z.number().min(0).max(100).default(50),
});
export type BackgroundOverlay = z.infer<typeof BackgroundOverlaySchema>;

// Background configuration (new unified system)
export const BackgroundConfigSchema = z.object({
  type: z.enum(["solid", "gradient", "image", "video"]).default("solid"),
  // Solid
  solidColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  // Gradient
  gradient: GradientConfigSchema.optional(),
  // Image
  imageUrl: z.string().url().optional().nullable(),
  imageCompression: z.number().min(0).max(100).optional(),
  // Video
  videoUrl: z.string().optional().nullable(),
  videoCompression: z.number().min(0).max(100).optional(),
  videoMuted: z.boolean().optional(),
  videoLoop: z.boolean().optional(),
  videoAutoplay: z.boolean().optional(),
  // Overlay (for image/video)
  overlay: BackgroundOverlaySchema.optional(),
});
export type BackgroundConfig = z.infer<typeof BackgroundConfigSchema>;

// Common styling props for all components
export const ComponentStylePropsSchema = z.object({
  textColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  backgroundColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  backgroundImageUrl: z.string().url().optional().nullable(),
  backgroundImageOpacity: z.number().min(0).max(100).default(100),
  // New unified background system
  background: BackgroundConfigSchema.optional(),
  // Height controls
  minHeight: z.enum(["auto", "25vh", "50vh", "75vh", "100vh"]).optional(),
  maxHeight: z.enum(["auto", "25vh", "50vh", "75vh", "100vh"]).optional(),
  // Legacy gradient support
  gradient: GradientConfigSchema.optional(),
  fontFamily: z.string().optional(),
  fontSize: z
    .enum(["xs", "sm", "md", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl"])
    .optional(),
  textAlign: z.enum(["left", "center", "right"]).default("left"),
  padding: z
    .enum(["none", "sm", "md", "lg", "xl", "2xl", "full"])
    .default("md"),
  margin: z.enum(["none", "sm", "md", "lg", "xl", "2xl"]).default("none"),
  shadow: z.enum(["none", "sm", "md", "lg", "xl", "2xl"]).default("none"),
  borderRadius: z
    .enum(["none", "sm", "md", "lg", "xl", "2xl", "full"])
    .default("none"),
  borderWidth: z.number().min(0).max(10).default(0),
  borderColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  // Glow effects
  glowColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  glowIntensity: z.number().min(0).max(100).default(0),
  // Animation
  animation: z
    .enum([
      "none",
      "fadeIn",
      "fadeInUp",
      "fadeInDown",
      "slideInLeft",
      "slideInRight",
      "zoomIn",
      "bounce",
    ])
    .default("none"),
  animationDuration: z.number().min(100).max(2000).default(500),
  animationDelay: z.number().min(0).max(1000).default(0),
  hoverAnimation: z
    .enum(["none", "scale", "lift", "glow", "shake"])
    .default("none"),
  hoverScale: z.number().min(1).max(1.5).default(1.05),
});
export type ComponentStyleProps = z.infer<typeof ComponentStylePropsSchema>;

export const PageComponentTypeSchema = z.enum([
  "hero",
  "about",
  "testimonials",
  "featured",
  "properties_grid",
  "text_block",
  "image",
  "video",
  "cta",
  "spacer",
  "divider",
  "map",
  "container",
  "two_column",
  "section_wrapper",
  "contact_section",
  "marquee",
  "scroll_zoom",
  "footer",
  "typewriter",
  "gallery",
]);
export type PageComponentType = z.infer<typeof PageComponentTypeSchema>;

// Gallery component props
export const BuilderGalleryImageSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  caption: z.string().max(200).optional(),
  alt: z.string().max(200).optional(),
  linkUrl: z.string().optional(),
  linkType: z.enum(["internal", "external"]).default("external"),
  // For mosaic/grid control
  colSpan: z.number().min(1).max(4).default(1),
  rowSpan: z.number().min(1).max(4).default(1),
  aspectRatio: z
    .enum(["auto", "square", "video", "portrait", "wide"])
    .default("auto"),
});

export const BuilderGalleryPropsSchema = z.object({
  title: z.string().max(80).optional(),
  subtitle: z.string().max(160).optional(),
  images: z.array(BuilderGalleryImageSchema).default([]),
  layout: z.enum(["grid", "mosaic", "masonry", "carousel"]).default("grid"),
  columns: z.number().min(1).max(6).default(3),
  gap: z.enum(["none", "sm", "md", "lg", "xl"]).default("md"),
  lightboxEnabled: z.boolean().default(true),
  showCaptions: z.boolean().default(false),
  style: ComponentStylePropsSchema.optional(),
});
export type BuilderGalleryProps = z.infer<typeof BuilderGalleryPropsSchema>;

// Hero component props
export const BuilderHeroPropsSchema = z.object({
  title: z.string().max(120).default(""),
  subtitle: z.string().max(300).optional(),
  imageUrl: z.string().url().optional().nullable(),
  ctaLabel: z.string().max(40).optional(),
  ctaUrl: z.string().optional(),
  ctaLinkType: z.enum(["internal", "external"]).default("internal"),
  buttonStyle: z.enum(["primary", "secondary", "outline"]).default("primary"),
  buttonColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  buttonTextColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  buttonBorderColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  badge: z.string().max(60).optional(),
  fullHeight: z.boolean().default(true),
  overlay: z
    .object({
      enabled: z.boolean().default(true),
      type: z.enum(["gradient", "solid"]).default("gradient"),
      color: z.string().default("#000000"),
      opacity: z.number().min(0).max(100).default(50),
      gradientStops: z
        .array(
          z.object({
            color: z.string(),
            position: z.number().min(0).max(100),
          }),
        )
        .optional(),
      gradientAngle: z.number().min(0).max(360).optional(),
    })
    .optional(),
  style: ComponentStylePropsSchema.optional(),
});
export type BuilderHeroProps = z.infer<typeof BuilderHeroPropsSchema>;

// About component props
export const BuilderAboutPropsSchema = z.object({
  title: z.string().max(80).optional(),
  text: z.string().max(3000).optional(),
  imageUrl: z.string().url().optional().nullable(),
  imagePosition: z.enum(["left", "right"]).default("right"),
  style: ComponentStylePropsSchema.optional(),
});
export type BuilderAboutProps = z.infer<typeof BuilderAboutPropsSchema>;

// Testimonials component props (inline)
export const BuilderTestimonialItemSchema = z.object({
  id: z.string(),
  quote: z.string().max(500),
  name: z.string().max(100),
  role: z.string().max(100),
  imageSrc: z.string().url().optional().nullable(),
});

export const BuilderTestimonialsPropsSchema = z.object({
  title: z.string().max(80).optional(),
  testimonials: z.array(BuilderTestimonialItemSchema).default([]),
  style: ComponentStylePropsSchema.optional(),
});
export type BuilderTestimonialsProps = z.infer<
  typeof BuilderTestimonialsPropsSchema
>;

// Text block props
export const BuilderTextBlockPropsSchema = z.object({
  content: z.string().max(5000).default(""),
  alignment: z.enum(["left", "center", "right"]).default("left"),
  maxWidth: z.enum(["sm", "md", "lg", "full"]).default("md"),
  /** Markdown # (h1) — normalized to #RRGGBB when saved */
  headingColor: z.string().max(7).optional(),
  /** Markdown ## / ### (h2, h3) */
  subheadingColor: z.string().max(7).optional(),
  bodyTextColor: z.string().max(7).optional(),
  listTextColor: z.string().max(7).optional(),
  linkTextColor: z.string().max(7).optional(),
  codeTextColor: z.string().max(7).optional(),
  style: ComponentStylePropsSchema.optional(),
});
export type BuilderTextBlockProps = z.infer<typeof BuilderTextBlockPropsSchema>;

// Image block props
export const ImageMaxWidthMobileSchema = z
  .enum(["full", "sm", "md", "lg", "xl", "2xl"])
  .default("full");
export const ImageMaxWidthDesktopSchema = z
  .enum([
    "full",
    "sm",
    "md",
    "lg",
    "xl",
    "2xl",
    "3xl",
    "4xl",
    "5xl",
    "6xl",
    "7xl",
  ])
  .default("5xl");

export const BuilderImagePropsSchema = z.object({
  imageUrl: z.string().url().optional().nullable(),
  caption: z.string().max(200).optional(),
  lightboxEnabled: z.boolean().default(true),
  alignment: z.enum(["left", "center", "right"]).default("center"),
  maxWidthMobile: ImageMaxWidthMobileSchema,
  maxWidthDesktop: ImageMaxWidthDesktopSchema,
  style: ComponentStylePropsSchema.optional(),
});
export type BuilderImageProps = z.infer<typeof BuilderImagePropsSchema>;

// Video block props
export const BuilderVideoPropsSchema = z.object({
  videoUrl: z.string().default(""),
  provider: z.enum(["youtube", "vimeo", "upload"]).default("youtube"),
  thumbnailUrl: z.string().url().optional().nullable(),
  autoplay: z.boolean().default(false),
  loop: z.boolean().default(false),
  muted: z.boolean().default(true),
  style: ComponentStylePropsSchema.optional(),
});
export type BuilderVideoProps = z.infer<typeof BuilderVideoPropsSchema>;

// Property grid props
export const BuilderPropertyGridPropsSchema = z.object({
  title: z.string().max(80).optional(),
  subtitle: z.string().max(160).optional(),
  propertyIds: z.array(z.string()).default([]),
  layout: z.enum(["grid", "carousel"]).default("grid"),
  showAllLink: z.boolean().default(false),
  maxProperties: z.number().int().min(1).max(12).default(6),
  style: ComponentStylePropsSchema.optional(),
});
export type BuilderPropertyGridProps = z.infer<
  typeof BuilderPropertyGridPropsSchema
>;

// CTA component props
export const BuilderCTAPropsSchema = z.object({
  title: z.string().max(120).default(""),
  subtitle: z.string().max(300).optional(),
  buttonLabel: z.string().max(40).default(""),
  buttonUrl: z.string().optional(),
  buttonLinkType: z.enum(["internal", "external"]).default("internal"),
  buttonStyle: z.enum(["primary", "secondary", "outline"]).default("primary"),
  buttonColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  buttonTextColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  buttonBorderColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  backgroundColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  style: ComponentStylePropsSchema.optional(),
});
export type BuilderCTAProps = z.infer<typeof BuilderCTAPropsSchema>;

// Spacer props
export const BuilderSpacerPropsSchema = z.object({
  height: z.enum(["sm", "md", "lg", "xl", "custom"]).default("md"),
  customHeight: z.number().int().min(16).max(500).optional(),
});
export type BuilderSpacerProps = z.infer<typeof BuilderSpacerPropsSchema>;

// Divider props (`lineVariant` replaces legacy string stored in `style`)
export const BuilderDividerPropsSchema = z.object({
  lineVariant: z
    .enum(["solid", "dashed", "dotted", "gradient"])
    .default("solid"),
  text: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});
export type BuilderDividerProps = z.infer<typeof BuilderDividerPropsSchema>;

// Map component props
export const BuilderMapPropsSchema = z.object({
  address: z.string().max(200).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  zoom: z.number().int().min(1).max(20).default(15),
  style: ComponentStylePropsSchema.optional(),
});
export type BuilderMapProps = z.infer<typeof BuilderMapPropsSchema>;

/** Nested block (container, columns, section) */
export const BuilderNestedBlockSchema = z.object({
  type: z.string(),
  props: z.record(z.any()).default({}),
});

// Container component props (wrapper for nested components)
export const BuilderContainerPropsSchema = z.object({
  children: z.array(BuilderNestedBlockSchema).default([]),
  layout: z.enum(["stack", "grid", "flex"]).default("stack"),
  direction: z.enum(["row", "column"]).default("column"),
  gap: z.enum(["none", "sm", "md", "lg", "xl"]).default("md"),
  alignItems: z.enum(["start", "center", "end", "stretch"]).default("start"),
  justifyContent: z
    .enum(["start", "center", "end", "between", "around"])
    .default("start"),
  minHeight: z.string().optional(),
  style: ComponentStylePropsSchema.optional(),
});
export type BuilderContainerProps = z.infer<typeof BuilderContainerPropsSchema>;

// Two column layout component props
export const BuilderTwoColumnPropsSchema = z.object({
  /** Prefer `leftChildren` / `rightChildren` for multiple blocks per column. */
  leftContent: z.record(z.any()).optional(),
  rightContent: z.record(z.any()).optional(),
  leftChildren: z.array(BuilderNestedBlockSchema).default([]),
  rightChildren: z.array(BuilderNestedBlockSchema).default([]),
  leftColumnWidth: z.number().min(20).max(80).default(50),
  rightColumnWidth: z.number().min(20).max(80).default(50),
  gap: z.enum(["none", "sm", "md", "lg", "xl"]).default("lg"),
  reverseOnMobile: z.boolean().default(false),
  leftStyle: ComponentStylePropsSchema.optional(),
  rightStyle: ComponentStylePropsSchema.optional(),
  style: ComponentStylePropsSchema.optional(),
});
export type BuilderTwoColumnProps = z.infer<typeof BuilderTwoColumnPropsSchema>;

// Section wrapper props
export const BuilderSectionWrapperPropsSchema = z.object({
  /** Prefer `children` for multiple nested blocks. */
  content: z.record(z.any()).optional(),
  children: z.array(BuilderNestedBlockSchema).default([]),
  style: ComponentStylePropsSchema.optional(),
  fullWidth: z.boolean().default(false),
  maxWidth: z.enum(["sm", "md", "lg", "xl", "2xl", "full"]).default("lg"),
});
export type BuilderSectionWrapperProps = z.infer<
  typeof BuilderSectionWrapperPropsSchema
>;

// Contact section props (enhanced contact form)
export const BuilderContactSectionPropsSchema = z.object({
  title: z.string().max(80).default(""),
  subtitle: z.string().max(200).optional(),
  formBackgroundColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  formTextColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  fields: z
    .object({
      name: z.boolean().default(true),
      phone: z.boolean().default(true),
      email: z.boolean().default(true),
      message: z.boolean().default(true),
    })
    .default({}),
  submitButtonText: z.string().max(50).default("Enviar Mensagem"),
  successMessage: z.string().max(200).default("Mensagem enviada com sucesso!"),
  buttonStyle: z.enum(["primary", "secondary", "outline"]).default("primary"),
  buttonColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  buttonTextColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  buttonBorderColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  titleColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  subtitleColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  style: ComponentStylePropsSchema.optional(),
});
export type BuilderContactSectionProps = z.infer<
  typeof BuilderContactSectionPropsSchema
>;

// Marquee props
export const BuilderMarqueePropsSchema = z.object({
  text: z.string().max(500).default(""),
  speed: z.enum(["slow", "normal", "fast"]).default("normal"),
  direction: z.enum(["left", "right"]).default("left"),
  backgroundColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  textColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  linkUrl: z.string().optional(),
  linkText: z.string().max(80).optional(),
  linkType: z.enum(["internal", "external"]).default("external"),
  style: ComponentStylePropsSchema.optional(),
});
export type BuilderMarqueeProps = z.infer<typeof BuilderMarqueePropsSchema>;

// Scroll Zoom props
export const BuilderScrollZoomPropsSchema = z.object({
  images: z.array(z.record(z.any())).default([]),
  title: z.string().max(120).optional(),
  subtitle: z.string().max(240).optional(),
  showTitle: z.boolean().default(true),
  titlePosition: z.enum(["center", "bottom"]).default("center"),
  containerHeight: z.string().default("300vh"),
  style: ComponentStylePropsSchema.optional(),
});
export type BuilderScrollZoomProps = z.infer<
  typeof BuilderScrollZoomPropsSchema
>;

// Footer props
export const BuilderFooterPropsSchema = z.object({
  logoText: z.string().max(80).optional(),
  copyrightText: z.string().max(200).optional(),
  showSocial: z.boolean().default(true),
  socialLinks: z.record(z.string()).default({}),
  columns: z
    .array(
      z.object({
        label: z.string().max(80),
        links: z.array(
          z.object({
            title: z.string().max(80),
            href: z.string(),
          }),
        ),
      }),
    )
    .default([]),
  style: ComponentStylePropsSchema.optional(),
});
export type BuilderFooterProps = z.infer<typeof BuilderFooterPropsSchema>;

// Typewriter props
export const BuilderTypewriterPropsSchema = z.object({
  texts: z.array(z.string()).default([]),
  speed: z.number().int().min(10).max(500).default(50),
  initialDelay: z.number().int().min(0).max(5000).optional(),
  waitTime: z.number().int().min(0).max(10000).default(2000),
  deleteSpeed: z.number().int().min(10).max(500).optional(),
  loop: z.boolean().default(true),
  showCursor: z.boolean().default(true),
  cursorChar: z.string().max(4).default("|"),
  preText: z.string().max(200).optional(),
  postText: z.string().max(200).optional(),
  textPosition: z.enum(["center", "left", "right"]).default("center"),
  staticTextColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  typewriterColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  fontSize: z.enum(["sm", "md", "lg", "xl", "2xl"]).optional(),
  bigText: z.boolean().default(false),
  style: ComponentStylePropsSchema.optional(),
});
export type BuilderTypewriterProps = z.infer<
  typeof BuilderTypewriterPropsSchema
>;

// Union of all component props (simple union, no discriminated union needed)
export type BuilderComponentProps =
  | BuilderHeroProps
  | BuilderAboutProps
  | BuilderTestimonialsProps
  | BuilderTextBlockProps
  | BuilderImageProps
  | BuilderVideoProps
  | BuilderPropertyGridProps
  | BuilderCTAProps
  | BuilderSpacerProps
  | BuilderDividerProps
  | BuilderMapProps
  | BuilderContainerProps
  | BuilderTwoColumnProps
  | BuilderSectionWrapperProps
  | BuilderContactSectionProps
  | BuilderMarqueeProps
  | BuilderScrollZoomProps
  | BuilderFooterProps
  | BuilderTypewriterProps
  | BuilderGalleryProps;

// Page component (individual component in a page)
export const PageComponentSchema = z.object({
  id: z.string().default(() => cuid()),
  type: PageComponentTypeSchema,
  props: z.record(z.any()).default({}),
  visible: z.boolean().default(true),
  order: z.number().int().min(0),
});
export type PageComponent = z.infer<typeof PageComponentSchema>;

export const PageChromeSchema = z.object({
  headerVariant: z.enum(["minimal", "glass", "solid"]).default("minimal"),
  headerBgColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  /** "Voltar ao site" in the default custom-page header (default: theme stone). */
  headerLinkColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  showHeader: z.boolean().default(true),
  showFooter: z.boolean().default(true),
  showSiteLink: z.boolean().default(true),
  footerExtraLine: z.string().max(200).optional(),
  /** Default site chrome footer (© line), not the Rodapé block. */
  footerChromeTextColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});
export type PageChrome = z.infer<typeof PageChromeSchema>;

// Custom page (full page config)
export const CustomPageSchema = z.object({
  id: z.string().default(() => cuid()),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  components: z.array(PageComponentSchema).default([]),

  // Page-level styling (legacy)
  backgroundColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  fontFamily: z.string().optional(),

  // New unified page background
  pageBackground: BackgroundConfigSchema.optional(),

  pageChrome: PageChromeSchema.optional(),

  // SEO
  seo: SeoSchema.optional(),

  // Preview token
  secretToken: z.string().optional(),

  // Visibility & order
  visible: z.boolean().default(true),
  order: z.number().int().min(0),
});
export type CustomPage = z.infer<typeof CustomPageSchema>;

// Legacy custom route (for backward compatibility)
export const LegacyCustomRouteSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(50),
  content: z.string().max(10000),
  visible: z.boolean().default(true),
  order: z.number().int().min(0),
});
export type LegacyCustomRoute = z.infer<typeof LegacyCustomRouteSchema>;

// Discriminated union for customRoutes
export const CustomRouteEntrySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("legacy") }).merge(LegacyCustomRouteSchema),
  z.object({ mode: z.literal("modular") }).merge(CustomPageSchema),
]);

// Helper to detect legacy vs modular
export function isLegacyCustomRoute(
  entry: unknown,
): entry is LegacyCustomRoute {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "content" in entry &&
    !("components" in entry)
  );
}
