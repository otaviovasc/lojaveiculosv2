"use client";

import type { StoreConfig } from "@centroimovel/types";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "#home", label: "Home" },
  { href: "#properties", label: "Imóveis" },
  { href: "#about", label: "Sobre" },
  { href: "#contact", label: "Contato" },
] as const;

interface QuadraHeaderProps {
  config: StoreConfig;
  slug: string;
  hasHero: boolean;
  isPropertiesPage?: boolean;
}

export function QuadraHeader({
  config,
  slug,
  hasHero,
  isPropertiesPage,
}: QuadraHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const useLight = hasHero && !scrolled && !isPropertiesPage;
  const navClass = useLight
    ? "text-white/85 hover:text-white transition-colors duration-200"
    : "text-[#0a0a0a]/75 hover:text-[#0a0a0a] transition-colors duration-200";

  const closeMobile = () => setMobileOpen(false);

  if (isPropertiesPage) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black/5">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link
            href={`/${slug}`}
            className="flex items-center gap-3 hover:scale-105 transition-transform duration-300"
          >
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={config.corretorName ?? slug}
                className="h-10 w-auto"
              />
            ) : (
              <span className="text-lg font-black tracking-tighter uppercase font-display text-stone-900">
                {config.corretorName ?? slug}
              </span>
            )}
          </Link>

          <Link
            href={`/${slug}`}
            className="hidden md:flex items-center gap-2 text-xs font-black uppercase tracking-widest text-stone-900 hover:opacity-60 transition-all"
          >
            <ArrowLeft size={14} strokeWidth={3} />
            Voltar
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-700 font-body ${
        scrolled ? "pt-4 px-4 sm:px-6 md:px-8" : "pt-0 px-0"
      }`}
    >
      <div
        className={`max-w-[1400px] mx-auto transition-all duration-700 relative overflow-hidden ${
          scrolled
            ? "rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] px-8 py-4"
            : "px-6 py-6 bg-transparent"
        }`}
      >
        {scrolled && (
          <>
            <div className="absolute inset-0 z-0 h-full w-full rounded-2xl shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)] pointer-events-none opacity-20" />
            <div
              className="absolute inset-0 isolate -z-10 h-full w-full overflow-hidden rounded-2xl"
              style={{ backdropFilter: 'url("#liquid-glass-filter")' }}
            />
          </>
        )}

        <div className="relative z-10 flex items-center justify-between">
          <Link
            href={`/${slug}`}
            className="text-lg font-black tracking-tighter uppercase focus:outline-none transition-transform hover:scale-105 font-display"
            style={{ color: useLight ? "#fff" : config.brandColor }}
          >
            {config.corretorName ?? slug}
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[11px] uppercase tracking-[0.2em] font-black">
            {navLinks.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className={`${navClass} relative focus:outline-none transition-all duration-300 group`}
              >
                {label}
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-current transition-all duration-300 group-hover:w-full opacity-60" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {config.socialLinks.whatsapp ? (
              <a
                href={`https://wa.me/${config.socialLinks.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center justify-center px-6 py-2.5 rounded-sm text-[10px] uppercase tracking-[0.15em] font-black text-white transition-all duration-500 hover:scale-105 hover:brightness-110 shadow-lg"
                style={{
                  backgroundColor: config.accentColor,
                  boxShadow: `0 8px 16px -4px ${config.accentColor}66`,
                }}
              >
                Consultoria
              </a>
            ) : (
              <Link
                href={`/${slug}/imoveis`}
                className="hidden sm:inline-flex items-center justify-center px-6 py-2.5 rounded-sm text-[10px] uppercase tracking-[0.15em] font-black text-white transition-all duration-500 hover:scale-105 hover:brightness-110 shadow-lg"
                style={{
                  backgroundColor: config.brandColor,
                  boxShadow: `0 8px 16px -4px ${config.brandColor}66`,
                }}
              >
                Ver imóveis
              </Link>
            )}

            <button
              type="button"
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className={`md:hidden w-10 h-10 flex items-center justify-center rounded-sm transition-all duration-300 focus:outline-none ${
                useLight
                  ? "text-white/90 hover:text-white bg-white/10"
                  : "text-[#0a0a0a]/80 hover:text-[#0a0a0a] bg-black/5"
              }`}
            >
              {mobileOpen ? (
                <X size={24} strokeWidth={2.5} />
              ) : (
                <Menu size={24} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMobile}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              aria-hidden
            />
            <motion.nav
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 w-[min(320px,85vw)] bg-white z-50 md:hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 pt-14 flex flex-col gap-1">
                {navLinks.map(({ href, label }) => (
                  <a
                    key={href}
                    href={href}
                    onClick={closeMobile}
                    className="py-4 text-base font-black uppercase tracking-[0.12em] text-[#0a0a0a]/80 hover:text-[#0a0a0a] border-b border-black/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset rounded-sm font-display"
                  >
                    {label}
                  </a>
                ))}
                <div className="pt-6 flex flex-col gap-2">
                  {config.socialLinks.whatsapp && (
                    <a
                      href={`https://wa.me/${config.socialLinks.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeMobile}
                      className="inline-flex items-center justify-center px-6 py-4 rounded-sm text-[12px] uppercase tracking-[0.12em] font-black text-white"
                      style={{ backgroundColor: "#25D366" }}
                    >
                      WhatsApp
                    </a>
                  )}
                  <Link
                    href={`/${slug}/imoveis`}
                    onClick={closeMobile}
                    className="inline-flex items-center justify-center px-6 py-4 rounded-sm border-2 text-[12px] uppercase tracking-[0.12em] font-black"
                    style={{
                      borderColor: config.brandColor,
                      color: config.brandColor,
                    }}
                  >
                    Ver imóveis
                  </Link>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
