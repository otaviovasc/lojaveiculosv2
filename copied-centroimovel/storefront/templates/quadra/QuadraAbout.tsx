"use client";

import type { StoreConfig } from "@centroimovel/types";

interface QuadraAboutProps {
  config: StoreConfig;
}

import { AnimatedDiv } from "@/components/ui/animated-div";

export function QuadraAbout({ config }: QuadraAboutProps) {
  return (
    <section
      id="about"
      className="px-6 py-32 md:py-48 md:px-12 bg-white font-body"
    >
      <div className="max-w-[1600px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-20 lg:gap-32">
          <AnimatedDiv className="relative">
            <div
              className="aspect-[4/5] md:aspect-square overflow-hidden rounded-sm border-2 bg-stone-50 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)]"
              style={{ borderColor: `${config.brandColor}08` }}
            >
              <img
                src={
                  config.aboutImageUrl ||
                  config.corretorPhotoUrl ||
                  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=900"
                }
                alt="Sobre o corretor"
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 hover:scale-110"
              />
            </div>
            <div
              className="absolute -bottom-8 -left-8 h-24 w-24 border-4"
              style={{ borderColor: config.brandColor }}
            />
          </AnimatedDiv>

          <div className="space-y-12">
            <AnimatedDiv delay={0.1} className="space-y-6">
              <span
                className="text-[10px] font-black tracking-[0.4em] uppercase opacity-40 italic"
                style={{ color: config.brandColor }}
              >
                Experiência & Credibilidade
              </span>
              <h2
                className="text-4xl md:text-6xl lg:text-7xl font-black leading-[0.9] uppercase italic tracking-tighter font-display"
                style={{
                  color: config.brandColor,
                }}
              >
                {config.aboutTitle ?? "Especialista no Alto Padrão"}
              </h2>
            </AnimatedDiv>

            <AnimatedDiv delay={0.2} className="space-y-10">
              <p
                className="text-xl md:text-2xl leading-relaxed opacity-60 font-medium italic"
                style={{ color: config.brandColor }}
              >
                {config.aboutText ??
                  "Minha consultoria é pessoal, estratégica e transparente. Entendo seu momento, seu objetivo e seu perfil de investimento para indicar imóveis com precisão e segurança."}
              </p>

              {config.corretorCreci && (
                <div
                  className="inline-flex items-center px-8 py-3 text-[9px] font-black uppercase tracking-[0.3em] rounded-sm border-2 italic shadow-sm"
                  style={{
                    color: config.brandColor,
                    borderColor: `${config.brandColor}10`,
                  }}
                >
                  Registro Profissional: {config.corretorCreci}
                </div>
              )}
            </AnimatedDiv>
          </div>
        </div>
      </div>
    </section>
  );
}
