"use client";

import type { StoreConfig } from "@centroimovel/types";
import { ArrowRight, Mail, Phone } from "lucide-react";

interface AuroraContactProps {
  config: StoreConfig;
}

import { AnimatedDiv } from "@/components/ui/animated-div";

export function AuroraContact({ config }: AuroraContactProps) {
  return (
    <section
      id="contact"
      className="px-6 py-32 md:py-48 md:px-12 relative overflow-hidden font-body"
      style={{ backgroundColor: config.brandColor }}
    >
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <AnimatedDiv className="space-y-8">
          <span className="text-[10px] font-black tracking-[0.4em] uppercase mb-10 block text-white/40 italic">
            Atendimento Exclusivo
          </span>
          <h2 className="text-4xl md:text-7xl lg:text-8xl font-black text-white leading-[0.85] uppercase italic tracking-tighter mb-12 font-display">
            Deseja uma consultoria personalizada?
          </h2>
          <p className="text-xl md:text-2xl text-white/50 font-medium max-w-3xl mx-auto mb-20 italic leading-relaxed">
            Nossa equipe de curadores está pronta para apresentar as joias do
            mercado imobiliário que se alinham perfeitamente ao seu estilo de
            vida.
          </p>
        </AnimatedDiv>

        <AnimatedDiv
          delay={0.2}
          className="flex flex-wrap justify-center gap-6"
        >
          {config.socialLinks.whatsapp && (
            <a
              href={`https://wa.me/${config.socialLinks.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-white px-12 py-6 text-[11px] font-black tracking-[0.3em] uppercase text-black transition-all duration-500 hover:scale-105 active:scale-95 flex items-center justify-center gap-4 shadow-[0_30px_60px_-15px_rgba(255,255,255,0.2)] rounded-sm italic"
            >
              Iniciar Conversa <ArrowRight size={20} strokeWidth={3} />
            </a>
          )}

          <div className="flex w-full sm:w-auto gap-4">
            {config.contact.email && (
              <a
                href={`mailto:${config.contact.email}`}
                className="flex-1 sm:flex-initial border-2 border-white/10 px-10 py-6 text-[10px] font-black tracking-[0.3em] uppercase text-white transition-all duration-500 hover:bg-white hover:text-black hover:border-white active:scale-95 flex items-center justify-center gap-3 rounded-sm italic"
              >
                <Mail size={18} strokeWidth={2.5} /> E-mail
              </a>
            )}
            {config.contact.phone && (
              <a
                href={`tel:${config.contact.phone}`}
                className="flex-1 sm:flex-initial border-2 border-white/10 px-10 py-6 text-[10px] font-black tracking-[0.3em] uppercase text-white transition-all duration-500 hover:bg-white hover:text-black hover:border-white active:scale-95 flex items-center justify-center gap-3 rounded-sm italic"
              >
                <Phone size={18} strokeWidth={2.5} /> Ligar
              </a>
            )}
          </div>
        </AnimatedDiv>
      </div>
    </section>
  );
}
