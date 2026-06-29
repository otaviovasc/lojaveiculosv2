"use client";

import { getPropertyUrl } from "@/lib/property-slug";
import { formatArea, formatBRL } from "@/lib/utils";
import type { ComponentStyleProps, StoreConfig } from "@centroimovel/types";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Bath, Bed, MapPin, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useContext } from "react";
import {
  auroraFadeIn,
  auroraStagger,
} from "../../templates/aurora/aurora-variants";
import type { TemplateProperty } from "../../templates/registry";
import { PreviewDocumentContext } from "./preview-document-context";
import {
  type MotionViewport,
  withPreviewMotionViewport,
} from "./preview-motion-viewport";
import { SectionSurface } from "./SectionSurface";
import { formatCssFontStack, getBorderRadiusValue } from "./style-utils";
import { defaultTextColorForTextBlock } from "./text-block-colors";

interface BuilderPropertyGridProps {
  mode?: "featured" | "properties_grid";
  title?: string;
  subtitle?: string;
  propertyIds?: string[];
  layout?: "grid" | "carousel";
  showAllLink?: boolean;
  maxProperties?: number;
  style?: ComponentStyleProps;
  config: StoreConfig;
  slug: string;
  properties: TemplateProperty[];
}

export function BuilderPropertyGrid({
  mode = "properties_grid",
  title,
  subtitle,
  propertyIds = [],
  layout = "grid",
  showAllLink = false,
  maxProperties = 6,
  style,
  config,
  slug,
  properties,
}: BuilderPropertyGridProps) {
  const previewDocument = useContext(PreviewDocumentContext);
  const propertyHeaderViewport = withPreviewMotionViewport(previewDocument, {
    once: true,
    amount: 0.2,
  });
  const propertyCardViewport = withPreviewMotionViewport(previewDocument, {
    once: true,
  });
  const shouldReduceMotion = useReducedMotion();

  // Filter properties if specific IDs are selected
  const featuredFirst =
    mode === "featured"
      ? properties.filter((property) => property.featured)
      : properties;
  const displayProperties =
    propertyIds.length > 0
      ? properties
          .filter((p) => propertyIds.includes(p.id))
          .slice(0, maxProperties)
      : (featuredFirst.length > 0 ? featuredFirst : properties).slice(
          0,
          maxProperties,
        );

  const resolvedTextColor =
    style?.textColor || defaultTextColorForTextBlock(style);
  const accentColor = config.accentColor || "#C9A84C";
  const headingFont = formatCssFontStack(
    style?.fontFamily || config.fonts?.heading,
  );
  const bodyFont = formatCssFontStack(style?.fontFamily || config.fonts?.body);

  if (displayProperties.length === 0) {
    return (
      <SectionSurface style={style} className="px-6 py-12 md:px-12">
        <div className="mx-auto text-center opacity-40 py-24 border-2 border-dashed border-gray-200 rounded-[2rem]">
          <p className="text-sm font-bold uppercase tracking-[0.2em]">
            Nenhum imóvel selecionado
          </p>
        </div>
      </SectionSurface>
    );
  }

  return (
    <SectionSurface style={style} className="px-6 py-24 md:py-32 md:px-12">
      <div className="mx-auto max-w-[1600px]">
        <motion.div
          variants={shouldReduceMotion ? undefined : auroraStagger(0.1, 0)}
          initial={shouldReduceMotion ? false : "hidden"}
          whileInView="show"
          viewport={propertyHeaderViewport}
          className="mb-20 flex flex-col md:flex-row items-end justify-between gap-10"
        >
          <div className="max-w-3xl text-left space-y-4">
            {(title || subtitle) && (
              <>
                <motion.span
                  variants={shouldReduceMotion ? undefined : auroraFadeIn("up")}
                  className="text-xs font-bold tracking-[0.3em] uppercase block"
                  style={{ color: accentColor }}
                >
                  {subtitle || "Propriedades"}
                </motion.span>
                <motion.h2
                  variants={
                    shouldReduceMotion ? undefined : auroraFadeIn("up", 0.1)
                  }
                  className="text-4xl md:text-6xl font-bold leading-tight tracking-tight"
                  style={{
                    color: resolvedTextColor,
                    fontFamily: headingFont,
                  }}
                >
                  {title || "Nossos Imóveis"}
                </motion.h2>
              </>
            )}
          </div>
          {showAllLink && (
            <motion.div
              variants={
                shouldReduceMotion ? undefined : auroraFadeIn("left", 0.2)
              }
              className="pb-2"
            >
              <Link
                href={`/${slug}/imoveis`}
                className="group flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] hover:opacity-70 transition-all"
                style={{ color: resolvedTextColor }}
              >
                Ver todas{" "}
                <div className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5 transition-transform group-hover:translate-x-2">
                  <ArrowRight size={16} />
                </div>
              </Link>
            </motion.div>
          )}
        </motion.div>

        {layout === "carousel" ? (
          <div className="flex gap-8 overflow-x-auto pb-12 snap-x snap-mandatory scrollbar-hide">
            {displayProperties.map((p, i) => (
              <div
                key={p.id}
                className="snap-start min-w-[300px] sm:min-w-[380px] lg:min-w-[420px]"
              >
                <PropertyCard
                  property={p}
                  config={config}
                  slug={slug}
                  index={i}
                  style={style}
                  resolvedTextColor={resolvedTextColor}
                  accentColor={accentColor}
                  headingFont={headingFont}
                  bodyFont={bodyFont}
                  cardViewport={
                    propertyCardViewport ??
                    ({ once: true } satisfies MotionViewport)
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {displayProperties.map((p, i) => (
              <PropertyCard
                key={p.id}
                property={p}
                config={config}
                slug={slug}
                index={i}
                style={style}
                resolvedTextColor={resolvedTextColor}
                accentColor={accentColor}
                headingFont={headingFont}
                bodyFont={bodyFont}
                cardViewport={
                  propertyCardViewport ??
                  ({ once: true } satisfies MotionViewport)
                }
              />
            ))}
          </div>
        )}
      </div>
    </SectionSurface>
  );
}

function PropertyCard({
  property,
  config,
  slug,
  index,
  style,
  resolvedTextColor,
  accentColor,
  headingFont,
  bodyFont,
  cardViewport,
}: {
  property: TemplateProperty;
  config: StoreConfig;
  slug: string;
  index: number;
  style?: ComponentStyleProps;
  resolvedTextColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  cardViewport: MotionViewport;
}) {
  const cardRadius =
    getBorderRadiusValue(style?.borderRadius as string | undefined) ?? "2.5rem";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={cardViewport}
      transition={{ delay: index * 0.1, duration: 0.8, ease: "easeOut" }}
      className="group relative block overflow-hidden bg-white/80 backdrop-blur-md transition-all hover:-translate-y-3 hover:shadow-2xl border border-white/20"
      style={{
        borderColor: `${resolvedTextColor}10`,
        borderRadius: cardRadius,
      }}
    >
      <a
        href={getPropertyUrl(slug, property)}
        className="block relative aspect-4/3 overflow-hidden bg-stone-100/50"
      >
        {property.coverPhotoUrl ? (
          <img
            src={property.coverPhotoUrl}
            alt={property.title}
            className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-300 font-bold uppercase tracking-widest text-xs">
            Imóvel Exclusivo
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center justify-center max-w-fit rounded-full bg-white/95 backdrop-blur shadow-lg px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-black">
              {property.purpose === "VENDA"
                ? "Venda"
                : property.purpose === "ALUGUEL"
                  ? "Aluguel"
                  : "Venda / Aluguel"}
            </span>
            {property.featured && (
              <span
                className="inline-flex max-w-fit rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg"
                style={{ backgroundColor: accentColor }}
              >
                Destaque
              </span>
            )}
          </div>
        </div>
      </a>

      <div className="p-8 md:p-10 space-y-6">
        <div className="space-y-4">
          <div
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] opacity-50"
            style={{ color: resolvedTextColor, fontFamily: bodyFont }}
          >
            <MapPin size={14} style={{ color: accentColor }} />
            <span className="truncate">
              {[property.neighborhood, property.city]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>

          <a
            href={getPropertyUrl(slug, property)}
            className="block group/title"
          >
            <h3
              className="text-2xl md:text-3xl font-bold leading-tight line-clamp-2 transition-colors group-hover/title:opacity-70"
              style={{
                color: resolvedTextColor,
                fontFamily: headingFont,
              }}
            >
              {property.title}
            </h3>
          </a>
        </div>

        <div
          className="flex flex-wrap items-center gap-x-6 gap-y-4 text-xs font-bold uppercase tracking-widest opacity-60"
          style={{ color: resolvedTextColor, fontFamily: bodyFont }}
        >
          {property.areaM2 != null && (
            <span className="flex items-center gap-2">
              <SlidersHorizontal size={16} className="rotate-90 opacity-40" />
              {formatArea(property.areaM2)}
            </span>
          )}
          {property.bedrooms != null && (
            <span className="flex items-center gap-2">
              <Bed size={16} className="opacity-40" /> {property.bedrooms}
            </span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-2">
              <Bath size={16} className="opacity-40" /> {property.bathrooms}
            </span>
          )}
        </div>

        <div
          className="border-t pt-8 flex items-center justify-between"
          style={{ borderColor: `${resolvedTextColor}10` }}
        >
          {!property.hidePrice ? (
            <div className="space-y-1">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40"
                style={{ color: resolvedTextColor, fontFamily: bodyFont }}
              >
                {property.purpose === "ALUGUEL"
                  ? "Valor Mensal"
                  : "Investimento"}
              </p>
              <p
                className="text-2xl md:text-3xl font-black flex items-baseline gap-1"
                style={{ color: accentColor, fontFamily: headingFont }}
              >
                {formatBRL(
                  property.purpose === "ALUGUEL"
                    ? property.rentPrice || property.price
                    : property.price,
                )}
                {property.purpose === "ALUGUEL" && (
                  <span className="text-xs font-bold opacity-50 ml-1">
                    /mês
                  </span>
                )}
              </p>
            </div>
          ) : (
            <p
              className="text-xs font-bold uppercase tracking-[0.2em] opacity-40"
              style={{ color: resolvedTextColor, fontFamily: bodyFont }}
            >
              Preço sob consulta
            </p>
          )}

          <a
            href={getPropertyUrl(slug, property)}
            className="h-14 w-14 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95 group-hover:-rotate-45"
            style={{ backgroundColor: resolvedTextColor, color: "#fff" }}
          >
            <ArrowRight size={22} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
