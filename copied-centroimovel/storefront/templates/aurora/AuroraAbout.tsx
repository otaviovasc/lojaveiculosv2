"use client";

import type { StoreConfig } from "@centroimovel/types";

interface AuroraAboutProps {
  config: StoreConfig;
}

import { AnimatedDiv } from "@/components/ui/animated-div";

export function AuroraAbout({ config }: AuroraAboutProps) {
  return (
    <section
      id="about"
      className="px-6 py-32 md:py-48 md:px-12 bg-white font-body"
    >
      <div className="mx-auto grid max-w-[1400px] items-center gap-20 md:grid-cols-2 lg:gap-32">
        <AnimatedDiv className="relative aspect-4/5 md:aspect-square overflow-hidden rounded-sm shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)]">
          <img
            src={
              config.aboutImageUrl ||
              config.corretorPhotoUrl ||
              "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800"
            }
            alt="Sobre"
            className="h-full w-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 hover:scale-110"
          />
        </AnimatedDiv>

        <div className="space-y-12 md:pl-8">
          <AnimatedDiv delay={0.1} className="space-y-6">
            <span
              className="text-[10px] font-black tracking-[0.4em] uppercase opacity-40 italic"
              style={{ color: config.brandColor }}
            >
              Nossa Identidade
            </span>
            <h2
              className="text-4xl md:text-6xl lg:text-7xl font-black leading-[0.9] uppercase italic tracking-tighter font-display"
              style={{
                color: config.brandColor,
              }}
            >
              {config.aboutTitle ?? "A Nova Era Imobiliária"}
            </h2>
          </AnimatedDiv>

          <AnimatedDiv delay={0.2} className="space-y-10">
            <p
              className="text-xl md:text-2xl leading-relaxed opacity-60 font-medium italic"
              style={{ color: config.brandColor }}
            >
              {config.aboutText ||
                "Com anos de experiência no mercado imobiliário de alto luxo, nos dedicamos a encontrar muito mais que uma propriedade: buscamos o cenário ideal para a sua próxima fase de vida. Nossa consultoria é pautada pela discrição, exclusividade e uma curadoria rigorosa dos melhores imóveis da região."}
            </p>

            {config.corretorCreci && (
              <div
                className="inline-flex items-center gap-4 rounded-sm px-8 py-3 bg-stone-50 text-[9px] font-black tracking-[0.3em] border-2 uppercase italic shadow-sm"
                style={{
                  borderColor: `${config.brandColor}10`,
                  color: config.brandColor,
                }}
              >
                Registro Profissional: {config.corretorCreci}
              </div>
            )}
          </AnimatedDiv>
        </div>
      </div>
    </section>
  );
}
