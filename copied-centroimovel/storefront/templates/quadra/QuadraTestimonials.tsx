"use client";

import type { StoreConfig } from "@centroimovel/types";
import { motion, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";
import { quadraDefaultTestimonials } from "./quadra-default-testimonials";
import { quadraFadeIn, quadraStagger } from "./quadra-variants";

interface QuadraTestimonialsProps {
  config: StoreConfig;
}

export function QuadraTestimonials({ config }: QuadraTestimonialsProps) {
  const shouldReduceMotion = useReducedMotion();
  const testimonials = (() => {
    const list = config.testimonials ?? [];
    const filled = list.filter(
      (t) => (t.quote && t.quote.trim()) || (t.name && t.name.trim()),
    );
    return filled.length > 0 ? filled : quadraDefaultTestimonials;
  })();

  if (testimonials.length === 0) return null;

  return (
    <section id="testimonials" className="py-16 md:py-24 bg-[#0a0a0a]">
      <div className="max-w-[1400px] mx-auto px-6">
        <motion.div
          variants={shouldReduceMotion ? {} : quadraStagger(0.1, 0)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mb-10"
        >
          <motion.div
            variants={quadraFadeIn("up")}
            className="h-[3px] w-12 mb-5"
            style={{ backgroundColor: config.accentColor }}
          />
          <motion.h2
            variants={quadraFadeIn("up", 0.06)}
            className="text-3xl md:text-5xl font-black tracking-tight uppercase text-white"
            style={{ fontFamily: `"${config.fonts.heading}", sans-serif` }}
          >
            Quem confia no meu trabalho
          </motion.h2>
        </motion.div>

        <motion.div
          variants={shouldReduceMotion ? {} : quadraStagger(0.08, 0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {testimonials.map((item) => (
            <motion.article
              key={item.id}
              variants={quadraFadeIn("up")}
              className="border border-white/10 bg-white/5 rounded-sm overflow-hidden group hover:border-white/20 transition-colors duration-300"
            >
              <div className="relative h-52 overflow-hidden bg-white/5">
                {item.imageSrc ? (
                  <>
                    <img
                      src={item.imageSrc}
                      alt={item.name}
                      className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-[#0a0a0a] to-transparent" />
                  </>
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: `${config.accentColor}18` }}
                  >
                    <span
                      className="text-4xl font-black text-white/40 uppercase tracking-widest"
                      style={{
                        fontFamily: `"${config.fonts.heading}", sans-serif`,
                      }}
                    >
                      {(item.name || "?").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div
                  className="w-8 h-[3px] mb-5"
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
                <p className="text-white/80 text-sm leading-relaxed mb-6 line-clamp-5">
                  “{item.quote}”
                </p>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-white text-sm font-black uppercase tracking-wider">
                    {item.name}
                  </p>
                  <p className="text-white/50 text-xs mt-1 uppercase tracking-[0.1em]">
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
