"use client";

import { Logo } from "@/components/ui/logo";
import type { StoreConfig } from "@centroimovel/types";
import Link from "next/link";

interface AuroraFooterProps {
  config: StoreConfig;
  slug: string;
}

export function AuroraFooter({ config, slug }: AuroraFooterProps) {
  return (
    <footer className="relative bg-black py-32 text-stone-500 overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-px opacity-20"
        style={{
          background: `linear-gradient(90deg, transparent, ${config.accentColor}, transparent)`,
        }}
      />
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 relative">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-20">
          <div className="md:col-span-2">
            <Link
              href={`/${slug}`}
              className="inline-block mb-10 grayscale hover:grayscale-0 transition-all"
            >
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt={config.corretorName ?? slug}
                  className="h-8 w-auto brightness-0 invert"
                />
              ) : (
                <Logo variant="full-white" className="h-8" />
              )}
            </Link>
            <p className="max-w-md text-xl font-medium italic leading-relaxed mb-10 opacity-50">
              Curadoria exclusiva de ativos imobiliários de alto padrão.
              Excelência estratégica em cada negociação.
            </p>
            {config.corretorCreci && (
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-stone-700 italic">
                Registro Profissional: {config.corretorCreci}
              </p>
            )}
          </div>

          <div>
            <h4 className="text-white text-[10px] font-black uppercase tracking-[0.4em] mb-10 italic">
              Navegação
            </h4>
            <nav className="flex flex-col gap-5 text-[11px] font-black uppercase tracking-[0.2em] italic">
              <a
                href="#home"
                className="hover:text-white transition-all hover:translate-x-2"
              >
                Página Inicial
              </a>
              <a
                href="#featured"
                className="hover:text-white transition-all hover:translate-x-2"
              >
                Imóveis Selecionados
              </a>
              <a
                href="#about"
                className="hover:text-white transition-all hover:translate-x-2"
              >
                A Consultoria
              </a>
              <a
                href="#contact"
                className="hover:text-white transition-all hover:translate-x-2"
              >
                Atendimento
              </a>
              <Link
                href={`/${slug}/imoveis`}
                className="text-white border-b border-white/20 pb-1 mt-4 hover:border-white transition-all w-fit"
              >
                Catálogo Completo
              </Link>
            </nav>
          </div>

          <div>
            <h4 className="text-white text-[10px] font-black uppercase tracking-[0.4em] mb-10 italic">
              Contato
            </h4>
            <div className="flex flex-col gap-6 text-[11px] font-black uppercase tracking-[0.2em] italic">
              {config.socialLinks.whatsapp && (
                <a
                  href={`https://wa.me/${config.socialLinks.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-all"
                >
                  <span className="opacity-40">WhatsApp:</span>{" "}
                  <span className="text-stone-300">
                    {config.socialLinks.whatsapp}
                  </span>
                </a>
              )}
              {config.contact.phone && (
                <a
                  href={`tel:${config.contact.phone}`}
                  className="hover:text-white transition-all"
                >
                  <span className="opacity-40">Telefone:</span>{" "}
                  <span className="text-stone-300">{config.contact.phone}</span>
                </a>
              )}
              {config.contact.email && (
                <a
                  href={`mailto:${config.contact.email}`}
                  className="hover:text-white transition-all break-all"
                >
                  <span className="opacity-40">Email:</span>{" "}
                  <span className="text-stone-300">{config.contact.email}</span>
                </a>
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
            <a href="#" className="hover:text-white transition-colors">
              Privacidade
            </a>
            <p className="not-italic tracking-normal normal-case opacity-50">
              Powered by Centro Imóvel
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
