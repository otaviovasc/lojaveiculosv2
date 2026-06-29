"use client";

import type { StoreConfig } from "@centroimovel/types";
import { motion, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";
import { auroraDefaultTestimonials } from "./aurora-default-testimonials";
import { auroraFadeIn, auroraStagger } from "./aurora-variants";

interface AuroraTestimonialsProps {
  config: StoreConfig;
}

export function AuroraTestimonials({ config }: AuroraTestimonialsProps) {
  const shouldReduceMotion = useReducedMotion();
  const testimonials = (() => {
    const list = config.testimonials ?? [];
    const filled = list.filter(
      (t) => (t.quote && t.quote.trim()) || (t.name && t.name.trim()),
    );
    return filled.length > 0 ? filled : auroraDefaultTestimonials;
  })();

  if (testimonials.length === 0) return null;

  return (
    <section
      id="testimonials"
      className="px-6 py-24 md:py-32 md:px-12 bg-stone-50"
      style={{ backgroundColor: `${config.brandColor}04` }}
    >
      <div className="max-w-[1600px] mx-auto">
        <motion.div
          variants={shouldReduceMotion ? {} : auroraStagger(0.1, 0)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mb-16 text-center max-w-2xl mx-auto"
        >
          <motion.span
            variants={auroraFadeIn("up")}
            className="text-sm font-bold tracking-[0.2em] uppercase block mb-4"
            style={{ color: config.accentColor }}
          >
            Depoimentos
          </motion.span>
          <motion.h2
            variants={auroraFadeIn("up", 0.08)}
            className="text-4xl md:text-5xl font-bold leading-tight"
            style={{
              color: config.brandColor,
              fontFamily: `"${config.fonts.heading}", serif`,
            }}
          >
            O que Nossos Clientes Dizem
          </motion.h2>
          <motion.p
            variants={auroraFadeIn("up", 0.15)}
            className="mt-6 text-lg opacity-80"
            style={{ color: config.brandColor }}
          >
            A satisfação dos nossos clientes é o nosso maior patrimônio.
          </motion.p>
        </motion.div>

        <motion.div
          variants={shouldReduceMotion ? {} : auroraStagger(0.08, 0.1)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
        >
          {testimonials.map((item) => (
            <motion.article
              key={item.id}
              variants={auroraFadeIn("up")}
              className="group relative overflow-hidden rounded-3xl bg-white border shadow-sm hover:shadow-xl transition-all duration-500"
              style={{ borderColor: `${config.brandColor}12` }}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                {item.imageSrc ? (
                  <>
                    <img
                      src={item.imageSrc}
                      alt={item.name}
                      className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    />
                    <div
                      className="absolute inset-x-0 bottom-0 h-24"
                      style={{
                        background: `linear-gradient(to top, ${config.brandColor}CC 0%, transparent 100%)`,
                      }}
                    />
                  </>
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: `${config.accentColor}15` }}
                  >
                    <span
                      className="text-4xl font-bold uppercase tracking-widest opacity-40"
                      style={{
                        fontFamily: `"${config.fonts.heading}", serif`,
                        color: config.brandColor,
                      }}
                    >
                      {typeof item.name === "string"
                        ? item.name.slice(0, 2).toUpperCase()
                        : "?"}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-8">
                <div
                  className="h-0.5 w-12 mb-6 rounded-full"
                  style={{ backgroundColor: config.accentColor }}
                />
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      style={{
                        color: config.accentColor,
                        fill: config.accentColor,
                      }}
                    />
                  ))}
                </div>
                <blockquote className="text-stone-700 leading-relaxed mb-6 line-clamp-4 font-light">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <div
                  className="pt-4 border-t"
                  style={{ borderColor: `${config.brandColor}15` }}
                >
                  <p
                    className="font-bold uppercase tracking-wider"
                    style={{
                      color: config.brandColor,
                      fontFamily: `"${config.fonts.heading}", serif`,
                    }}
                  >
                    {item.name}
                  </p>
                  <p
                    className="text-sm mt-0.5 opacity-70"
                    style={{ color: config.brandColor }}
                  >
                    {item.role}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
