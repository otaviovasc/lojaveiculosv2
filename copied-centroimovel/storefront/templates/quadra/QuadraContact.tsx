"use client";

import type { StoreConfig } from "@centroimovel/types";
import { ArrowUpRight, Mail, Phone } from "lucide-react";

interface QuadraContactProps {
  config: StoreConfig;
}

import { AnimatedDiv } from "@/components/ui/animated-div";

export function QuadraContact({ config }: QuadraContactProps) {
  const whatsapp = config.socialLinks.whatsapp;

  return (
    <section
      id="contact"
      className="px-6 py-32 md:py-48 md:px-12 bg-stone-50 font-body"
    >
      <div className="max-w-[1600px] mx-auto px-6 md:px-12">
        <div
          className="border-2 rounded-sm p-12 md:p-24 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)]"
          style={{
            borderColor: `${config.brandColor}08`,
            backgroundColor: "#fff",
          }}
        >
          <AnimatedDiv className="space-y-10">
            <span
              className="text-[10px] font-black tracking-[0.4em] uppercase opacity-40 italic block mb-6"
              style={{ color: config.brandColor }}
            >
              Vamos Conversar?
            </span>
            <h2
              className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter leading-[0.85] mb-8 font-display"
              style={{
                color: config.brandColor,
              }}
            >
              Pronto para o próximo nível?
            </h2>
            <p
              className="text-xl md:text-2xl mb-16 max-w-3xl opacity-60 font-medium italic leading-relaxed"
              style={{ color: config.brandColor }}
            >
              Estamos prontos para desenhar a estratégia ideal para o seu
              objetivo imobiliário, com precisão absoluta.
            </p>

            <div className="flex flex-wrap gap-6">
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-4 px-12 py-6 rounded-sm text-white text-[11px] font-black uppercase tracking-[0.3em] italic transition-all duration-500 hover:scale-105 active:scale-95 shadow-2xl"
                  style={{
                    backgroundColor: "#000",
                  }}
                >
                  WhatsApp
                  <ArrowUpRight size={20} strokeWidth={3} />
                </a>
              )}

              <div className="flex w-full sm:w-auto gap-4">
                {config.contact.email && (
                  <a
                    href={`mailto:${config.contact.email}`}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-3 px-10 py-6 rounded-sm border-2 text-[10px] font-black uppercase tracking-[0.3em] italic transition-all duration-500 hover:bg-black hover:text-white hover:border-black active:scale-95"
                    style={{
                      borderColor: `${config.brandColor}10`,
                      color: config.brandColor,
                    }}
                  >
                    E-mail
                    <Mail size={18} strokeWidth={2.5} />
                  </a>
                )}
                {config.contact.phone && (
                  <a
                    href={`tel:${config.contact.phone}`}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-3 px-10 py-6 rounded-sm border-2 text-[10px] font-black uppercase tracking-[0.3em] italic transition-all duration-500 hover:bg-black hover:text-white hover:border-black active:scale-95"
                    style={{
                      borderColor: `${config.brandColor}10`,
                      color: config.brandColor,
                    }}
                  >
                    Ligar
                    <Phone size={18} strokeWidth={2.5} />
                  </a>
                )}
              </div>
            </div>
          </AnimatedDiv>
        </div>
      </div>
    </section>
  );
}
