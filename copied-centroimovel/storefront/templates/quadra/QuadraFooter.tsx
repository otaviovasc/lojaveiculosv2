"use client";

import type { StoreConfig } from "@centroimovel/types";
import Link from "next/link";

interface QuadraFooterProps {
  config: StoreConfig;
  slug: string;
}

export function QuadraFooter({ config, slug }: QuadraFooterProps) {
  return (
    <footer className="bg-black py-24 text-stone-500 overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-20">
          <div>
            <p
              className="text-2xl font-black uppercase italic tracking-tighter mb-4 text-white"
              style={{
                fontFamily: `"${config.fonts.heading}", sans-serif`,
              }}
            >
              {config.corretorName ?? slug}
            </p>
            {config.corretorCreci && (
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 italic">
                Registro: {config.corretorCreci}
              </p>
            )}
          </div>

          <div>
            <p className="text-white text-[10px] font-black uppercase tracking-[0.4em] mb-10 italic">
              Navegação
            </p>
            <div className="flex flex-col gap-5 text-[11px] font-black uppercase tracking-[0.2em] italic">
              <a
                href="#home"
                className="hover:text-white transition-all hover:translate-x-2"
              >
                Início
              </a>
              <a
                href="#featured"
                className="hover:text-white transition-all hover:translate-x-2"
              >
                Vitrine
              </a>
              <a
                href="#about"
                className="hover:text-white transition-all hover:translate-x-2"
              >
                Biografia
              </a>
              <a
                href="#contact"
                className="hover:text-white transition-all hover:translate-x-2"
              >
                Contato
              </a>
              <Link
                href={`/${slug}/imoveis`}
                className="text-white border-b border-white/20 pb-1 mt-4 hover:border-white transition-all w-fit"
              >
                Ver Catálogo
              </Link>
            </div>
          </div>

          <div>
            <p className="text-white text-[10px] font-black uppercase tracking-[0.4em] mb-10 italic">
              Conectar
            </p>
            <div className="flex flex-col gap-6 text-[11px] font-black uppercase tracking-[0.2em] italic">
              {config.socialLinks.whatsapp && (
                <p>
                  <span className="opacity-40">WhatsApp:</span>{" "}
                  <span className="text-stone-300">
                    {config.socialLinks.whatsapp}
                  </span>
                </p>
              )}
              {config.contact.phone && (
                <p>
                  <span className="opacity-40">Telefone:</span>{" "}
                  <span className="text-stone-300">{config.contact.phone}</span>
                </p>
              )}
              {config.contact.email && (
                <p>
                  <span className="opacity-40">E-mail:</span>{" "}
                  <span className="text-stone-300">{config.contact.email}</span>
                </p>
              )}
              {config.contact.address && (
                <p className="leading-relaxed opacity-30 not-italic font-medium normal-case text-xs">
                  {config.contact.address}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-32 pt-10 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-8 text-[9px] font-black uppercase tracking-[0.4em] italic opacity-30">
          <p>
            © {new Date().getFullYear()} {config.corretorName ?? slug}
          </p>
          <div className="flex items-center gap-12">
            <p className="not-italic tracking-normal normal-case opacity-50">
              Powered by Centro Imóvel
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
