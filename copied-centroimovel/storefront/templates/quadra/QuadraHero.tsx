"use client";

import { StorefrontLink } from "@/modules/storefront/lib/utm-navigation";
import type { StoreConfig } from "@centroimovel/types";
import { useReducedMotion } from "framer-motion";

interface QuadraHeroProps {
  config: StoreConfig;
  slug: string;
}

import { AnimatedDiv } from "@/components/ui/animated-div";

export function QuadraHero({ config, slug }: QuadraHeroProps) {
  const shouldReduceMotion = useReducedMotion();
  const profileImage =
    config.corretorPhotoUrl ||
    config.heroImageUrl ||
    config.aboutImageUrl ||
    "/default-hero.jpg";
  const realtorName = config.corretorName || "";
  const hasRealtorInfo = !!realtorName;

  return (
    <section
      id="home"
      className="relative min-h-[100vh] flex items-center overflow-hidden pt-32 pb-24 font-body bg-[#0a0a0a]"
      aria-label="Página inicial"
    >
      {/* Editorial Background Element */}
      <div className="absolute top-0 right-0 w-1/2 h-full hidden lg:block overflow-hidden">
        <div className="absolute inset-0 bg-stone-900 skew-x-12 translate-x-24 border-l border-white/5" />
        {config.heroImageUrl && (
          <div className="absolute inset-0 skew-x-12 translate-x-24 overflow-hidden">
            <img
              src={config.heroImageUrl}
              alt=""
              className="w-full h-full object-cover -skew-x-12 scale-125 opacity-30 grayscale hover:grayscale-0 transition-all duration-1000"
            />
          </div>
        )}
      </div>

      <div className="relative z-10 max-w-[1500px] mx-auto px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-0 items-center">
          {/* Main Content Area */}
          <div className="lg:col-span-8 lg:pr-20 relative">
            <AnimatedDiv className="mb-6 flex items-center gap-4">
              <div
                className="h-[1px] w-12"
                style={{ backgroundColor: config.accentColor }}
              />
              <span
                className="text-[11px] uppercase tracking-[0.5em] font-black"
                style={{ color: config.accentColor }}
              >
                {config.corretorCreci
                  ? "Consultoria Imobiliária"
                  : "Experiência Premium"}
              </span>
            </AnimatedDiv>

            <AnimatedDiv delay={0.1}>
              <h1
                className="text-6xl sm:text-8xl lg:text-[140px] font-black tracking-tighter leading-[0.8] mb-12 uppercase font-display mix-blend-difference"
                style={{ color: "#fff" }}
              >
                {config.heroTitle.split(" ").map((word, i, arr) => (
                  <span
                    key={i}
                    className={`block ${i === arr.length - 1 ? "text-stone-500" : ""}`}
                  >
                    {word}
                  </span>
                ))}
              </h1>
            </AnimatedDiv>

            <div className="flex flex-col md:flex-row items-start gap-12 mt-16">
              <AnimatedDiv delay={0.2} className="max-w-md">
                <p className="text-lg md:text-xl font-medium tracking-tight leading-relaxed text-stone-400">
                  {config.heroSubtitle ||
                    "Descubra uma nova forma de viver, onde cada detalhe é pensado para o seu máximo conforto e sofisticação."}
                </p>

                <div className="mt-10 flex flex-wrap gap-5">
                  <StorefrontLink
                    href={`/${slug}/imoveis`}
                    className="group relative inline-flex items-center justify-center px-10 py-5 bg-white text-black text-[11px] uppercase tracking-[0.2em] font-black transition-all duration-500 hover:bg-stone-200"
                  >
                    Ver Propriedades
                  </StorefrontLink>
                  {config.socialLinks.whatsapp && (
                    <a
                      href={`https://wa.me/${config.socialLinks.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-10 py-5 text-white text-[11px] uppercase tracking-[0.2em] font-black border border-white/20 transition-all duration-500 hover:border-white hover:bg-white/5"
                    >
                      Contato Direto
                    </a>
                  )}
                </div>
              </AnimatedDiv>

              {/* Stats Block */}
              {hasRealtorInfo && (
                <AnimatedDiv
                  delay={0.3}
                  className="grid grid-cols-2 gap-x-12 gap-y-8 border-l border-white/10 pl-12"
                >
                  <div className="space-y-1">
                    <div className="text-3xl font-black text-white font-display">
                      15y+
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">
                      Expertise
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-black text-white font-display">
                      500+
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">
                      Vendas
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-black text-white font-display">
                      R$ 2B
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">
                      Negociado
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-3xl font-black text-white font-display">
                      24h
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">
                      Suporte
                    </div>
                  </div>
                </AnimatedDiv>
              )}
            </div>
          </div>

          {/* Portrait Column */}
          <div className="lg:col-span-4 relative flex justify-end items-center">
            <AnimatedDiv delay={0.4} className="relative w-full max-w-[450px]">
              {/* Floating Name Label */}
              {realtorName && (
                <div className="absolute -left-12 top-1/4 -rotate-90 origin-left z-20">
                  <span className="text-[40px] font-black text-white/5 uppercase tracking-tighter whitespace-nowrap select-none">
                    {realtorName}
                  </span>
                </div>
              )}

              {/* Main Image Container */}
              <div className="relative aspect-[3/4] overflow-hidden grayscale hover:grayscale-0 transition-all duration-700 group border border-white/10">
                <img
                  src={profileImage}
                  alt={realtorName || "Foto"}
                  className="w-full h-full object-cover object-[center_top] transition-transform duration-[3s] group-hover:scale-110"
                />

                {/* Image Overlay Label */}
                {realtorName && (
                  <div className="absolute bottom-0 right-0 p-8 bg-black/80 backdrop-blur-md border-t border-l border-white/10">
                    <div className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] mb-1">
                      {config.corretorCreci || "Especialista"}
                    </div>
                    <div className="text-xl font-bold text-white uppercase tracking-tight">
                      {realtorName}
                    </div>
                  </div>
                )}
              </div>

              {/* Decorative Accent */}
              <div
                className="absolute -top-10 -right-10 w-40 h-40 border-t-2 border-r-2 opacity-20"
                style={{ borderColor: config.accentColor }}
              />
            </AnimatedDiv>
          </div>
        </div>
      </div>

      {/* Vertical Navigation Bar */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-12 items-center">
        <div className="w-[1px] h-20 bg-gradient-to-b from-transparent via-stone-700 to-transparent" />
        <div className="flex flex-col gap-8">
          {["INÍCIO", "IMÓVEIS", "SOBRE", "CONTATO"].map((item) => (
            <span
              key={item}
              className="[writing-mode:vertical-lr] text-[9px] font-black tracking-[0.4em] text-stone-700 hover:text-white cursor-pointer transition-colors"
            >
              {item}
            </span>
          ))}
        </div>
        <div className="w-[1px] h-20 bg-gradient-to-b from-transparent via-stone-700 to-transparent" />
      </div>
    </section>
  );
}
