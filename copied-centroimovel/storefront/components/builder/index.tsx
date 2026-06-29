"use client";

import type {
  BackgroundConfig,
  ComponentStyleProps,
  StoreConfig,
  Testimonial,
} from "@centroimovel/types";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpDown,
  Box,
  Building,
  Columns,
  FileText,
  Footprints,
  Grid,
  Image,
  Mail,
  MapPin,
  Megaphone,
  Minus,
  PanelTop,
  Quote,
  ScrollText,
  Sparkles,
  Square,
  Star,
  Type,
  User,
  Video,
} from "lucide-react";
import type { TemplateProperty } from "../../templates/registry";
import { BackgroundSelector } from "./BackgroundSelector";
import { BuilderAbout } from "./BuilderAbout";
import { BuilderContactSection } from "./BuilderContactSection";
import { BuilderContainer } from "./BuilderContainer";
import { BuilderCTA } from "./BuilderCTA";
import {
  BuilderDivider,
  resolveDividerLineVariant,
  type BuilderDividerProps,
} from "./BuilderDivider";
import { BuilderFooter } from "./BuilderFooter";
import { BuilderGallery } from "./BuilderGallery";
import { BuilderHeader } from "./BuilderHeader";
import { BuilderHero } from "./BuilderHero";
import { BuilderImage } from "./BuilderImage";
import { BuilderMap } from "./BuilderMap";
import { BuilderMarquee } from "./BuilderMarquee";
import { BuilderPropertyGrid } from "./BuilderPropertyGrid";
import { BuilderSectionWrapper } from "./BuilderSectionWrapper";
import { BuilderSpacer } from "./BuilderSpacer";
import { BuilderTestimonials } from "./BuilderTestimonials";
import { BuilderTextBlock } from "./BuilderTextBlock";
import { BuilderTwoColumn } from "./BuilderTwoColumn";
import { BuilderTypewriter } from "./BuilderTypewriter";
import { BuilderVideo } from "./BuilderVideo";
import { mergePropsBorderRadiusCascade } from "./merge-props-border-radius-cascade";

type Nested = { type: string; props: Record<string, unknown> };

interface HeroOverlay {
  enabled: boolean;
  type: "gradient" | "solid";
  color: string;
  opacity: number;
  gradientStops?: Array<{ color: string; position: number }>;
  gradientAngle?: number;
}

interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  alt?: string;
  linkUrl?: string;
  linkType?: "internal" | "external";
  colSpan?: number;
  rowSpan?: number;
  aspectRatio?: "auto" | "square" | "video" | "portrait" | "wide";
}

interface HeaderLink {
  title: string;
  href: string;
}

interface FooterLink {
  title: string;
  href: string;
  icon?: string;
}

interface FooterColumn {
  label: string;
  links: FooterLink[];
}

interface ContactFields {
  name?: boolean;
  phone?: boolean;
  email?: boolean;
  message?: boolean;
}

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
  whatsapp?: string;
}

export const COMPONENT_CATEGORIES = {
  conteudo: [
    { type: "hero", label: "Hero", icon: Sparkles },
    { type: "about", label: "Sobre", icon: User },
    { type: "text_block", label: "Texto", icon: FileText },
    { type: "testimonials", label: "Depoimentos", icon: Quote },
    { type: "cta", label: "Chamada (CTA)", icon: Megaphone },
    { type: "contact_section", label: "Contato", icon: Mail },
    { type: "typewriter", label: "Typewriter", icon: Type },
  ],
  imagens: [
    { type: "image", label: "Imagem", icon: Image },
    { type: "gallery", label: "Galeria", icon: Grid },
    { type: "video", label: "Vídeo", icon: Video },
  ],
  imoveis: [
    { type: "featured", label: "Destaques", icon: Star },
    { type: "properties_grid", label: "Imóveis", icon: Building },
  ],
  layout: [
    { type: "container", label: "Container", icon: Box },
    { type: "two_column", label: "Duas Colunas", icon: Columns },
    { type: "section_wrapper", label: "Seção", icon: Square },
  ],
  design: [
    { type: "spacer", label: "Espaço", icon: ArrowUpDown },
    { type: "divider", label: "Divisor", icon: Minus },
    { type: "map", label: "Mapa", icon: MapPin },
    { type: "marquee", label: "Faixa Texto", icon: ScrollText },
  ],
  pagina: [
    { type: "header", label: "Cabeçalho", icon: PanelTop },
    { type: "footer", label: "Rodapé", icon: Footprints },
  ],
} as const;

export const COMPONENT_ICONS: Record<string, LucideIcon> = {
  hero: Sparkles,
  about: User,
  text_block: FileText,
  testimonials: Quote,
  cta: Megaphone,
  contact_section: Mail,
  image: Image,
  gallery: Grid,
  video: Video,
  featured: Star,
  properties_grid: Building,
  container: Box,
  two_column: Columns,
  section_wrapper: Square,
  spacer: ArrowUpDown,
  divider: Minus,
  map: MapPin,
  marquee: ScrollText,
  header: PanelTop,
  typewriter: Type,
  footer: Footprints,
};

export const COMPONENT_LABELS: Record<string, string> = {
  hero: "Hero",
  about: "Sobre",
  text_block: "Bloco de Texto",
  image: "Imagem",
  gallery: "Galeria",
  video: "Vídeo",
  testimonials: "Depoimentos",
  featured: "Imóveis em Destaque",
  properties_grid: "Grid de Imóveis",
  cta: "Chamada para Ação",
  spacer: "Espaço",
  divider: "Divisor",
  map: "Mapa",
  container: "Container",
  two_column: "Duas Colunas",
  section_wrapper: "Seção",
  contact_section: "Seção de Contato",
  marquee: "Faixa de Texto",
  header: "Cabeçalho",
  typewriter: "Typewriter",
  footer: "Rodapé",
};

export { BackgroundSelector };

interface PageComponentProps {
  type: string;
  props: Record<string, unknown>;
  config: StoreConfig;
  slug: string;
  properties?: TemplateProperty[];
  pageBackground?: BackgroundConfig;
  inheritedBorderRadius?: ComponentStyleProps["borderRadius"];
  /** Workspace display name (footer + previews) */
  workspaceDisplayName?: string | null;
}

export function BuilderComponentRenderer({
  type,
  props: rawProps,
  config,
  slug,
  properties = [],
  pageBackground,
  inheritedBorderRadius,
  workspaceDisplayName,
}: PageComponentProps) {
  const mergedLeaf = mergePropsBorderRadiusCascade(
    rawProps,
    inheritedBorderRadius,
  );

  switch (type) {
    case "hero":
      return (
        <BuilderHero
          title={mergedLeaf.title as string | undefined}
          subtitle={mergedLeaf.subtitle as string | undefined}
          imageUrl={mergedLeaf.imageUrl as string | null | undefined}
          ctaLabel={mergedLeaf.ctaLabel as string | undefined}
          ctaUrl={mergedLeaf.ctaUrl as string | undefined}
          ctaLinkType={
            mergedLeaf.ctaLinkType as "internal" | "external" | undefined
          }
          buttonStyle={
            mergedLeaf.buttonStyle as
              "primary" | "secondary" | "outline" | undefined
          }
          buttonColor={mergedLeaf.buttonColor as string | undefined}
          buttonTextColor={mergedLeaf.buttonTextColor as string | undefined}
          buttonBorderColor={mergedLeaf.buttonBorderColor as string | undefined}
          badge={mergedLeaf.badge as string | undefined}
          fullHeight={mergedLeaf.fullHeight as boolean | undefined}
          overlay={mergedLeaf.overlay as HeroOverlay | undefined}
          style={mergedLeaf.style as ComponentStyleProps | undefined}
          config={config}
          slug={slug}
        />
      );

    case "about":
      return (
        <BuilderAbout
          title={mergedLeaf.title as string | undefined}
          text={mergedLeaf.text as string | undefined}
          imageUrl={mergedLeaf.imageUrl as string | null | undefined}
          imagePosition={
            mergedLeaf.imagePosition as "left" | "right" | undefined
          }
          style={mergedLeaf.style as ComponentStyleProps | undefined}
          config={config}
        />
      );

    case "testimonials":
      return (
        <BuilderTestimonials
          title={mergedLeaf.title as string | undefined}
          testimonials={mergedLeaf.testimonials as Testimonial[] | undefined}
          style={mergedLeaf.style as ComponentStyleProps | undefined}
          config={config}
        />
      );

    case "text_block":
      return (
        <BuilderTextBlock
          content={mergedLeaf.content as string | undefined}
          alignment={
            mergedLeaf.alignment as "left" | "center" | "right" | undefined
          }
          maxWidth={
            mergedLeaf.maxWidth as "sm" | "md" | "lg" | "full" | undefined
          }
          headingColor={mergedLeaf.headingColor as string | undefined}
          subheadingColor={mergedLeaf.subheadingColor as string | undefined}
          bodyTextColor={mergedLeaf.bodyTextColor as string | undefined}
          listTextColor={mergedLeaf.listTextColor as string | undefined}
          linkTextColor={mergedLeaf.linkTextColor as string | undefined}
          codeTextColor={mergedLeaf.codeTextColor as string | undefined}
          style={mergedLeaf.style as ComponentStyleProps | undefined}
        />
      );

    case "image":
      return (
        <BuilderImage
          imageUrl={mergedLeaf.imageUrl as string | null | undefined}
          caption={mergedLeaf.caption as string | undefined}
          lightboxEnabled={mergedLeaf.lightboxEnabled as boolean | undefined}
          alignment={
            mergedLeaf.alignment as "left" | "center" | "right" | undefined
          }
          maxWidthMobile={mergedLeaf.maxWidthMobile as string | undefined}
          maxWidthDesktop={mergedLeaf.maxWidthDesktop as string | undefined}
          style={mergedLeaf.style as ComponentStyleProps | undefined}
        />
      );

    case "gallery":
      return (
        <BuilderGallery
          title={mergedLeaf.title as string | undefined}
          subtitle={mergedLeaf.subtitle as string | undefined}
          images={mergedLeaf.images as GalleryImage[] | undefined}
          layout={
            mergedLeaf.layout as
              "grid" | "mosaic" | "masonry" | "carousel" | undefined
          }
          columns={mergedLeaf.columns as number | undefined}
          gap={mergedLeaf.gap as "none" | "sm" | "md" | "lg" | "xl" | undefined}
          lightboxEnabled={mergedLeaf.lightboxEnabled as boolean | undefined}
          showCaptions={mergedLeaf.showCaptions as boolean | undefined}
          style={mergedLeaf.style as ComponentStyleProps | undefined}
          config={config}
        />
      );

    case "video":
      return (
        <BuilderVideo
          videoUrl={mergedLeaf.videoUrl as string | undefined}
          provider={
            mergedLeaf.provider as "youtube" | "vimeo" | "upload" | undefined
          }
          thumbnailUrl={mergedLeaf.thumbnailUrl as string | null | undefined}
          autoplay={mergedLeaf.autoplay as boolean | undefined}
          loop={mergedLeaf.loop as boolean | undefined}
          muted={mergedLeaf.muted as boolean | undefined}
          style={mergedLeaf.style as ComponentStyleProps | undefined}
        />
      );

    case "featured":
    case "properties_grid":
      return (
        <BuilderPropertyGrid
          mode={type === "featured" ? "featured" : "properties_grid"}
          title={mergedLeaf.title as string | undefined}
          subtitle={mergedLeaf.subtitle as string | undefined}
          propertyIds={mergedLeaf.propertyIds as string[] | undefined}
          layout={mergedLeaf.layout as "grid" | "carousel" | undefined}
          showAllLink={mergedLeaf.showAllLink as boolean | undefined}
          maxProperties={mergedLeaf.maxProperties as number | undefined}
          style={mergedLeaf.style as ComponentStyleProps | undefined}
          config={config}
          slug={slug}
          properties={properties}
        />
      );

    case "cta":
      return (
        <BuilderCTA
          title={mergedLeaf.title as string | undefined}
          subtitle={mergedLeaf.subtitle as string | undefined}
          buttonLabel={mergedLeaf.buttonLabel as string | undefined}
          buttonUrl={mergedLeaf.buttonUrl as string | undefined}
          buttonLinkType={
            mergedLeaf.buttonLinkType as "internal" | "external" | undefined
          }
          buttonStyle={
            mergedLeaf.buttonStyle as
              "primary" | "secondary" | "outline" | undefined
          }
          buttonColor={mergedLeaf.buttonColor as string | undefined}
          buttonTextColor={mergedLeaf.buttonTextColor as string | undefined}
          buttonBorderColor={mergedLeaf.buttonBorderColor as string | undefined}
          backgroundColor={mergedLeaf.backgroundColor as string | undefined}
          style={mergedLeaf.style as ComponentStyleProps | undefined}
          config={config}
        />
      );

    case "spacer":
      return (
        <BuilderSpacer
          height={
            mergedLeaf.height as
              "sm" | "md" | "lg" | "xl" | "custom" | undefined
          }
          customHeight={mergedLeaf.customHeight as number | undefined}
        />
      );

    case "divider":
      return (
        <BuilderDivider
          lineVariant={resolveDividerLineVariant({
            lineVariant: mergedLeaf.lineVariant as
              BuilderDividerProps["lineVariant"] | undefined,
            style: mergedLeaf.style as BuilderDividerProps["style"],
          })}
          text={mergedLeaf.text as string | undefined}
          color={mergedLeaf.color as string | undefined}
        />
      );

    case "map":
      return (
        <BuilderMap
          address={mergedLeaf.address as string | undefined}
          latitude={mergedLeaf.latitude as number | undefined}
          longitude={mergedLeaf.longitude as number | undefined}
          zoom={mergedLeaf.zoom as number | undefined}
          style={mergedLeaf.style as ComponentStyleProps | undefined}
        />
      );

    case "container":
      return (
        <BuilderContainer
          childComponents={rawProps.children as Nested[] | undefined}
          layout={rawProps.layout as "stack" | "grid" | "flex" | undefined}
          direction={rawProps.direction as "row" | "column" | undefined}
          gap={rawProps.gap as "none" | "sm" | "md" | "lg" | "xl" | undefined}
          alignItems={
            rawProps.alignItems as
              "start" | "center" | "end" | "stretch" | undefined
          }
          justifyContent={
            rawProps.justifyContent as
              "start" | "center" | "end" | "between" | "around" | undefined
          }
          minHeight={rawProps.minHeight as string | undefined}
          style={rawProps.style as ComponentStyleProps | undefined}
          config={config}
          slug={slug}
          properties={properties}
          pageBackground={pageBackground}
          inheritedBorderRadius={inheritedBorderRadius}
          workspaceDisplayName={workspaceDisplayName}
        />
      );

    case "two_column":
      return (
        <BuilderTwoColumn
          leftContent={rawProps.leftContent as Nested | undefined}
          rightContent={rawProps.rightContent as Nested | undefined}
          leftChildren={rawProps.leftChildren as Nested[] | undefined}
          rightChildren={rawProps.rightChildren as Nested[] | undefined}
          leftColumnWidth={rawProps.leftColumnWidth as number | undefined}
          rightColumnWidth={rawProps.rightColumnWidth as number | undefined}
          gap={rawProps.gap as "none" | "sm" | "md" | "lg" | "xl" | undefined}
          reverseOnMobile={rawProps.reverseOnMobile as boolean | undefined}
          leftStyle={rawProps.leftStyle as ComponentStyleProps | undefined}
          rightStyle={rawProps.rightStyle as ComponentStyleProps | undefined}
          style={rawProps.style as ComponentStyleProps | undefined}
          config={config}
          slug={slug}
          properties={properties}
          pageBackground={pageBackground}
          inheritedBorderRadius={inheritedBorderRadius}
          workspaceDisplayName={workspaceDisplayName}
        />
      );

    case "section_wrapper":
      return (
        <BuilderSectionWrapper
          content={rawProps.content as Nested | undefined}
          childComponents={rawProps.children as Nested[] | undefined}
          style={rawProps.style as ComponentStyleProps | undefined}
          fullWidth={rawProps.fullWidth as boolean | undefined}
          maxWidth={
            rawProps.maxWidth as
              "sm" | "md" | "lg" | "xl" | "2xl" | "full" | undefined
          }
          config={config}
          slug={slug}
          properties={properties}
          pageBackground={pageBackground}
          inheritedBorderRadius={inheritedBorderRadius}
          workspaceDisplayName={workspaceDisplayName}
        />
      );

    case "contact_section":
      return (
        <BuilderContactSection
          title={mergedLeaf.title as string | undefined}
          subtitle={mergedLeaf.subtitle as string | undefined}
          fields={mergedLeaf.fields as ContactFields | undefined}
          submitButtonText={mergedLeaf.submitButtonText as string | undefined}
          successMessage={mergedLeaf.successMessage as string | undefined}
          buttonStyle={
            mergedLeaf.buttonStyle as
              "primary" | "secondary" | "outline" | undefined
          }
          buttonColor={mergedLeaf.buttonColor as string | undefined}
          buttonTextColor={mergedLeaf.buttonTextColor as string | undefined}
          buttonBorderColor={mergedLeaf.buttonBorderColor as string | undefined}
          titleColor={mergedLeaf.titleColor as string | undefined}
          subtitleColor={mergedLeaf.subtitleColor as string | undefined}
          formBackgroundColor={
            mergedLeaf.formBackgroundColor as string | undefined
          }
          formTextColor={mergedLeaf.formTextColor as string | undefined}
          style={mergedLeaf.style as ComponentStyleProps | undefined}
          config={config}
          workspaceSlug={slug}
        />
      );

    case "marquee":
      return (
        <BuilderMarquee
          text={mergedLeaf.text as string | undefined}
          speed={mergedLeaf.speed as "slow" | "normal" | "fast" | undefined}
          direction={mergedLeaf.direction as "left" | "right" | undefined}
          backgroundColor={mergedLeaf.backgroundColor as string | undefined}
          textColor={mergedLeaf.textColor as string | undefined}
          linkUrl={mergedLeaf.linkUrl as string | undefined}
          linkText={mergedLeaf.linkText as string | undefined}
          linkType={mergedLeaf.linkType as "internal" | "external" | undefined}
          style={mergedLeaf.style as ComponentStyleProps | undefined}
          config={config}
        />
      );

    case "header":
      return (
        <BuilderHeader
          links={mergedLeaf.links as HeaderLink[] | undefined}
          logoText={mergedLeaf.logoText as string | undefined}
          sticky={mergedLeaf.sticky as boolean | undefined}
          showContactButton={
            mergedLeaf.showContactButton as boolean | undefined
          }
          contactButtonText={mergedLeaf.contactButtonText as string | undefined}
          contactButtonLink={mergedLeaf.contactButtonLink as string | undefined}
          showSocial={mergedLeaf.showSocial as boolean | undefined}
          style={mergedLeaf.style as ComponentStyleProps | undefined}
          config={config}
          workspaceDisplayName={workspaceDisplayName}
        />
      );

    case "footer":
      return (
        <BuilderFooter
          columns={mergedLeaf.columns as FooterColumn[] | undefined}
          logoText={mergedLeaf.logoText as string | undefined}
          copyrightText={mergedLeaf.copyrightText as string | undefined}
          showSocial={mergedLeaf.showSocial as boolean | undefined}
          socialLinks={mergedLeaf.socialLinks as SocialLinks | undefined}
          style={mergedLeaf.style as ComponentStyleProps | undefined}
          config={config}
          workspaceDisplayName={workspaceDisplayName}
        />
      );

    case "typewriter":
      return (
        <BuilderTypewriter
          texts={mergedLeaf.texts as string[] | undefined}
          speed={mergedLeaf.speed as number | undefined}
          initialDelay={mergedLeaf.initialDelay as number | undefined}
          waitTime={mergedLeaf.waitTime as number | undefined}
          deleteSpeed={mergedLeaf.deleteSpeed as number | undefined}
          loop={mergedLeaf.loop as boolean | undefined}
          showCursor={mergedLeaf.showCursor as boolean | undefined}
          cursorChar={mergedLeaf.cursorChar as string | undefined}
          preText={mergedLeaf.preText as string | undefined}
          postText={mergedLeaf.postText as string | undefined}
          textPosition={
            mergedLeaf.textPosition as "center" | "left" | "right" | undefined
          }
          staticTextColor={mergedLeaf.staticTextColor as string | undefined}
          typewriterColor={mergedLeaf.typewriterColor as string | undefined}
          fontSize={
            mergedLeaf.fontSize as "sm" | "md" | "lg" | "xl" | "2xl" | undefined
          }
          bigText={mergedLeaf.bigText as boolean | undefined}
          style={mergedLeaf.style as ComponentStyleProps | undefined}
          config={config}
        />
      );

    default:
      return (
        <div className="p-8 text-center text-gray-400">
          Componente desconhecido: {type}
        </div>
      );
  }
}
