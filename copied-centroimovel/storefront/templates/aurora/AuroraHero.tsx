"use client";

import { StorefrontLink } from "@/modules/storefront/lib/utm-navigation";
import type { StoreConfig } from "@centroimovel/types";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { auroraFadeIn, auroraStagger } from "./aurora-variants";

interface AuroraHeroProps {
  config: StoreConfig;
  slug: string;
}

export function AuroraHero({ config, slug }: AuroraHeroProps) {
  const shouldReduceMotion = useReducedMotion();
  const heroImage = config.heroImageUrl || "/default-hero.jpg";
  const realtorName = config.corretorName || "";
  const hasRealtorInfo = !!realtorName;

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden px-6 md:px-12 -mt-16 pt-24 font-body"
      aria-label="Página inicial"
    >
      {/* Hero background with subtle parallax-ready layer */}
      <div className="absolute inset-0 z-0">
        <div
          className={`absolute inset-0 scale-105 ${!shouldReduceMotion ? "will-change-transform animate-[aurora-hero-kenburns_25s_ease-in-out_infinite_alternate]" : ""}`}
        >
          <img
            src={heroImage}
            alt=""
            className="h-full w-full object-cover"
            fetchPriority="high"
          />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.8) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto">
        <div
          className={`grid grid-cols-1 ${hasRealtorInfo ? "lg:grid-cols-12" : "lg:grid-cols-1"} items-center gap-12 lg:gap-20`}
        >
          {/* Left Column: Content */}
          <motion.div
            variants={shouldReduceMotion ? {} : auroraStagger(0.12, 0.25)}
            initial="hidden"
            animate="show"
            className={`${hasRealtorInfo ? "lg:col-span-7" : "max-w-4xl"} space-y-8`}
          >
            <motion.div variants={auroraFadeIn("up", 0)}>
              <span className="inline-block px-4 py-1.5 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] mb-4 bg-white/10 backdrop-blur-md border border-white/20 text-white">
                {config.corretorCreci
                  ? `CRECI: ${config.corretorCreci}`
                  : "Imóveis de Alto Padrão"}
              </span>
            </motion.div>

            <motion.h1
              variants={auroraFadeIn("up", 0.1)}
              className="text-5xl font-black tracking-tight leading-[0.9] md:text-7xl lg:text-[110px] drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)] uppercase font-display"
              style={{
                color: "#FFFFFF",
                textShadow: "0 4px 60px rgba(0,0,0,0.6)",
              }}
            >
              {config.heroTitle}
            </motion.h1>

            {config.heroSubtitle && (
              <motion.p
                variants={auroraFadeIn("up", 0.2)}
                className="max-w-2xl text-base md:text-xl font-medium tracking-tight leading-relaxed text-white/80 drop-shadow-2xl"
              >
                {config.heroSubtitle}
              </motion.p>
            )}

            <motion.div
              variants={auroraFadeIn("up", 0.35)}
              className="pt-8 flex flex-col sm:flex-row items-center gap-4 md:gap-6"
            >
              <StorefrontLink
                href={`/${slug}/imoveis`}
                className="group relative overflow-hidden inline-flex h-14 md:h-16 w-full sm:w-auto min-w-[240px] items-center justify-center gap-3 rounded-full px-8 md:px-12 text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-500 hover:scale-105 hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] active:scale-[0.98]"
                style={{
                  backgroundColor: config.accentColor,
                  color: "#FFF",
                }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                Explorar Catálogo
                <ArrowRight
                  size={18}
                  className="transition-transform duration-500 group-hover:translate-x-2"
                />
              </StorefrontLink>
              {config.socialLinks.whatsapp && (
                <a
                  href={`https://wa.me/${config.socialLinks.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-14 md:h-16 w-full sm:w-auto min-w-[240px] items-center justify-center gap-3 rounded-full px-8 md:px-12 text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-500 bg-white/5 backdrop-blur-xl border border-white/20 text-white hover:bg-white/10 hover:border-white/40 hover:scale-105 shadow-xl"
                >
                  Falar com Consultor
                </a>
              )}
            </motion.div>
          </motion.div>

          {/* Right Column: Dynamic Info Card */}
          {hasRealtorInfo && (
            <motion.div
              variants={auroraFadeIn("left", 0.5)}
              initial="hidden"
              animate="show"
              className="hidden lg:block lg:col-span-5 relative"
            >
              <div className="relative group">
                {/* Decorative Blur */}
                <div
                  className="absolute -inset-4 rounded-[40px] blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-700"
                  style={{ backgroundColor: config.accentColor }}
                />

                {/* Info Card */}
                <div className="relative p-10 rounded-[40px] bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-8">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: config.accentColor }}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                        Novidade no catálogo
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-white uppercase font-display leading-tight">
                      Curadoria Exclusiva
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-4">
                    <div className="space-y-1">
                      <div className="text-3xl font-black text-white font-display">
                        12+
                      </div>
                      <div className="text-[9px] uppercase tracking-widest text-white/50 font-bold">
                        Lançamentos recentes
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-3xl font-black text-white font-display">
                        100%
                      </div>
                      <div className="text-[9px] uppercase tracking-widest text-white/50 font-bold">
                        Atendimento Prime
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10">
                    <p className="text-sm text-white/70 leading-relaxed font-medium">
                      {config.aboutText
                        ? config.aboutText.substring(0, 120) + "..."
                        : "Especialista em realizar sonhos e conectar pessoas aos melhores imóveis do mercado."}
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                        <img
                          src={config.corretorPhotoUrl || "/default-avatar.png"}
                          alt={realtorName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] font-black text-white uppercase tracking-wider">
                          {realtorName}
                        </div>
                        <div className="text-[9px] font-medium text-white/40 uppercase tracking-widest">
                          {config.corretorCreci || "Especialista Imobiliário"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Element */}
                <div className="absolute -bottom-6 -right-6 p-6 rounded-3xl bg-white text-black shadow-2xl flex items-center gap-4 border border-white/10">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
                    style={{ backgroundColor: config.accentColor }}
                  >
                    <ArrowRight className="-rotate-90" size={24} />
                  </div>
                  <div>
                    <div className="text-[14px] font-black uppercase tracking-tight leading-none">
                      Ver Imóveis
                    </div>
                    <div className="text-[10px] font-bold text-black/50 uppercase tracking-widest">
                      Disponíveis agora
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Scroll cue */}
      <motion.a
        href="#featured"
        aria-label="Rolar para ver imóveis"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-10 left-12 z-10 flex items-center gap-4 text-white/60 hover:text-white/90 transition-colors duration-300"
      >
        <div className="w-px h-12 bg-white/20 relative overflow-hidden">
          <motion.div
            animate={{ y: [-48, 48] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 left-0 w-full h-1/2 bg-white"
          />
        </div>
        <span className="text-[10px] uppercase tracking-[0.3em] font-semibold">
          Role para Explorar
        </span>
      </motion.a>
    </section>
  );
}
