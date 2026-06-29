"use client";

import type { ComponentStyleProps, StoreConfig } from "@centroimovel/types";
import { motion, useReducedMotion } from "framer-motion";
import { useContext } from "react";
import {
  auroraFadeIn,
  auroraStagger,
} from "../../templates/aurora/aurora-variants";
import { PreviewDocumentContext } from "./preview-document-context";
import { withPreviewMotionViewport } from "./preview-motion-viewport";
import { SectionSurface } from "./SectionSurface";
import { formatCssFontStack } from "./style-utils";
import { defaultTextColorForTextBlock } from "./text-block-colors";

interface BuilderAboutProps {
  title?: string;
  text?: string;
  imageUrl?: string | null;
  imagePosition?: "left" | "right";
  style?: ComponentStyleProps;
  config: StoreConfig;
}

export function BuilderAbout({
  title,
  text,
  imageUrl,
  imagePosition = "right",
  style,
  config,
}: BuilderAboutProps) {
  const previewDocument = useContext(PreviewDocumentContext);
  const aboutViewport = withPreviewMotionViewport(previewDocument, {
    once: true,
    amount: 0.2,
  });
  const shouldReduceMotion = useReducedMotion();
  const displayImage =
    imageUrl || config.aboutImageUrl || config.corretorPhotoUrl;
  const displayTitle = title || config.aboutTitle || "Sobre Nós";
  const displayText = text || config.aboutText;

  const resolvedTextColor =
    style?.textColor || defaultTextColorForTextBlock(style);
  const accentColor = config.accentColor || "#C9A84C";
  const fontFamily = style?.fontFamily
    ? `"${style.fontFamily}", serif`
    : `"${config.fonts.heading}", serif`;

  return (
    <SectionSurface style={style} className="px-6 py-24 md:py-32 md:px-12">
      <div className="mx-auto grid max-w-[1400px] items-center gap-16 md:grid-cols-2">
        <motion.div
          variants={auroraFadeIn(imagePosition === "left" ? "right" : "left")}
          initial="hidden"
          whileInView="show"
          viewport={aboutViewport}
          className={`relative aspect-3/4 md:aspect-square overflow-hidden rounded-4xl shadow-2xl ${
            imagePosition === "left" ? "md:order-1" : "md:order-2"
          }`}
        >
          <div className="absolute inset-x-8 -bottom-8 h-full bg-white/20 rounded-4xl -rotate-3 blur-md" />
          <img
            src={
              displayImage ||
              "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800"
            }
            alt="Sobre"
            className="relative z-10 h-full w-full object-cover transition-transform duration-1000 hover:scale-105"
          />
        </motion.div>

        <motion.div
          variants={shouldReduceMotion ? {} : auroraStagger(0.1, 0.1)}
          initial="hidden"
          whileInView="show"
          viewport={aboutViewport}
          className={`space-y-8 ${imagePosition === "left" ? "md:order-2" : "md:order-1"}`}
        >
          <motion.div variants={auroraFadeIn("up")} className="space-y-3">
            <span
              className="text-xs font-bold tracking-[0.3em] uppercase"
              style={{ color: accentColor }}
            >
              Conheça
            </span>
            <h2
              className="text-4xl md:text-6xl font-bold leading-tight tracking-tight"
              style={{
                color: resolvedTextColor,
                fontFamily,
              }}
            >
              {displayTitle}
            </h2>
            <div
              className="h-1 w-20 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
          </motion.div>

          <motion.p
            variants={auroraFadeIn("up", 0.3)}
            className="text-lg md:text-xl leading-relaxed opacity-80 font-light"
            style={{ color: resolvedTextColor }}
          >
            {displayText}
          </motion.p>

          {config.corretorCreci && (
            <motion.div
              variants={auroraFadeIn("up", 0.4)}
              className="inline-flex items-center gap-3 rounded-full px-6 py-2.5 bg-white/50 backdrop-blur-sm shadow-sm text-[10px] font-bold tracking-[0.2em] border uppercase"
              style={{
                borderColor: `${resolvedTextColor}15`,
                color: resolvedTextColor,
                fontFamily: formatCssFontStack(config.fonts?.body),
              }}
            >
              CRECI: {config.corretorCreci}
            </motion.div>
          )}
        </motion.div>
      </div>
    </SectionSurface>
  );
}
