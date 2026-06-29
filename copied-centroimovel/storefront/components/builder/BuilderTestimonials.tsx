"use client";

import type {
  ComponentStyleProps,
  StoreConfig,
  Testimonial,
} from "@centroimovel/types";
import { motion, useReducedMotion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { useContext } from "react";
import {
  auroraFadeIn,
  auroraStagger,
} from "../../templates/aurora/aurora-variants";
import { PreviewDocumentContext } from "./preview-document-context";
import { withPreviewMotionViewport } from "./preview-motion-viewport";
import { SectionSurface } from "./SectionSurface";
import { formatCssFontStack, getBorderRadiusValue } from "./style-utils";
import { defaultTextColorForTextBlock } from "./text-block-colors";

interface BuilderTestimonialsProps {
  title?: string;
  testimonials?: Testimonial[];
  style?: ComponentStyleProps;
  config: StoreConfig;
}

export function BuilderTestimonials({
  title,
  testimonials = [],
  style,
  config,
}: BuilderTestimonialsProps) {
  const previewDocument = useContext(PreviewDocumentContext);
  const testimonialsViewportLoose = withPreviewMotionViewport(previewDocument, {
    once: true,
    amount: 0.2,
  });
  const testimonialsViewportTight = withPreviewMotionViewport(previewDocument, {
    once: true,
    amount: 0.1,
  });
  const shouldReduceMotion = useReducedMotion();
  const displayTestimonials =
    testimonials.length > 0 ? testimonials : config.testimonials;

  if (displayTestimonials.length === 0) {
    return null;
  }

  const resolvedTextColor =
    style?.textColor || defaultTextColorForTextBlock(style);
  const accentColor = config.accentColor || "#C9A84C";
  const headingFont = formatCssFontStack(
    style?.fontFamily || config.fonts?.heading,
  );
  const bodyFont = formatCssFontStack(style?.fontFamily || config.fonts?.body);

  return (
    <SectionSurface style={style} className="px-6 py-24 md:py-32 md:px-12">
      <div className="mx-auto max-w-[1600px]">
        <motion.div
          variants={shouldReduceMotion ? {} : auroraStagger(0.1, 0)}
          initial="hidden"
          whileInView="show"
          viewport={testimonialsViewportLoose}
          className="mb-20 text-center max-w-3xl mx-auto space-y-6"
        >
          <motion.div
            variants={auroraFadeIn("up")}
            className="flex justify-center"
          >
            <Quote
              size={48}
              className="opacity-10"
              style={{ color: accentColor }}
            />
          </motion.div>
          <motion.h2
            variants={auroraFadeIn("up", 0.1)}
            className="text-4xl md:text-6xl font-bold leading-tight tracking-tight"
            style={{
              color: resolvedTextColor,
              fontFamily: headingFont,
            }}
          >
            {title || "O que Nossos Clientes Dizem"}
          </motion.h2>
          <motion.p
            variants={auroraFadeIn("up", 0.2)}
            className="text-lg md:text-xl opacity-70 font-light leading-relaxed"
            style={{ color: resolvedTextColor, fontFamily: bodyFont }}
          >
            A satisfação dos nossos clientes é o nosso maior patrimônio e a base
            do nosso sucesso.
          </motion.p>
        </motion.div>

        <motion.div
          variants={shouldReduceMotion ? {} : auroraStagger(0.08, 0.1)}
          initial="hidden"
          whileInView="show"
          viewport={testimonialsViewportTight}
          className="grid gap-10 md:grid-cols-2 lg:grid-cols-3"
        >
          {displayTestimonials.map((item) => {
            const cardRadius =
              getBorderRadiusValue(style?.borderRadius as string | undefined) ??
              "2.5rem";
            return (
              <motion.article
                key={item.id}
                variants={auroraFadeIn("up")}
                className="group relative overflow-hidden bg-white/50 backdrop-blur-md border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
                style={{
                  borderColor: `${resolvedTextColor}10`,
                  borderRadius: cardRadius,
                }}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-stone-100/50">
                  {item.imageSrc ? (
                    <>
                      <img
                        src={item.imageSrc}
                        alt={item.name}
                        className="h-full w-full object-cover object-center transition-transform duration-1000 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
                      <span
                        className="text-5xl font-bold uppercase tracking-widest opacity-10"
                        style={{
                          fontFamily: headingFont,
                          color: resolvedTextColor,
                        }}
                      >
                        {typeof item.name === "string"
                          ? item.name.slice(0, 2).toUpperCase()
                          : "?"}
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-6 left-8 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className="drop-shadow-md"
                        style={{
                          color: accentColor,
                          fill: accentColor,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-10 space-y-6">
                  <blockquote
                    className="text-lg leading-relaxed font-light italic opacity-80 line-clamp-4"
                    style={{ color: resolvedTextColor, fontFamily: bodyFont }}
                  >
                    &ldquo;{item.quote}&rdquo;
                  </blockquote>

                  <div
                    className="pt-6 border-t flex items-center gap-4"
                    style={{ borderColor: `${resolvedTextColor}10` }}
                  >
                    <div className="flex flex-col">
                      <p
                        className="font-bold uppercase tracking-[0.2em] text-xs"
                        style={{
                          color: resolvedTextColor,
                          fontFamily: headingFont,
                        }}
                      >
                        {item.name}
                      </p>
                      <p
                        className="text-[10px] mt-1 font-bold uppercase tracking-[0.15em] opacity-40"
                        style={{
                          color: resolvedTextColor,
                          fontFamily: bodyFont,
                        }}
                      >
                        {item.role}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </SectionSurface>
  );
}
