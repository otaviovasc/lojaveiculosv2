"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { LogoWithVariant } from "@/components/ui/logo";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { useScroll } from "@/components/ui/use-scroll";
import { cn } from "@/lib/utils";
import { StorefrontLink } from "@/modules/storefront/lib/utm-navigation";
import type { StoreConfig } from "@centroimovel/types";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import React from "react";

interface StorefrontHeaderProps {
  config: StoreConfig;
  slug: string;
  hasHero?: boolean;
}

export function StorefrontHeader({
  config,
  slug,
  hasHero = true,
}: StorefrontHeaderProps) {
  const [open, setOpen] = React.useState(false);
  const scrolled = useScroll(10);

  const links = [
    { label: "Nossos Imóveis", href: `/${slug}/imoveis`, preserveUtm: true },
    { label: "Sobre", href: "#about", preserveUtm: false },
  ];

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Determine if we should use light text (white) or brand color
  // Only if hasHero is true and we haven't scrolled yet
  const useLightText = !scrolled && hasHero && !open;

  return (
    <header
      className={cn(
        "sticky top-0 z-60 mx-auto w-full max-w-5xl border-b border-transparent md:rounded-full md:border md:transition-all md:ease-out",
        {
          "bg-white/80 border-stone-200 backdrop-blur-lg md:top-4 md:max-w-4xl md:shadow-lg":
            scrolled && !open,
          "bg-white transition-none": open,
        },
      )}
    >
      <nav
        className={cn(
          "flex h-16 w-full items-center justify-between pl-6 pr-1.5 md:h-14 md:transition-all md:ease-out",
          {
            "md:pl-5 md:pr-1.5": scrolled,
          },
        )}
      >
        <Link href={`/${slug}`} className="flex items-center gap-2">
          {config.logoUrl ? (
            <img
              src={config.logoUrl}
              alt={config.corretorName ?? "Logo"}
              className="h-7 w-auto object-contain"
            />
          ) : (
            <LogoWithVariant useLight={useLightText} className="h-7" />
          )}
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-2 md:flex">
          {links.map((link, i) =>
            link.preserveUtm ? (
              <StorefrontLink
                key={i}
                href={link.href}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "text-sm font-medium transition-colors duration-300",
                  useLightText
                    ? "text-white hover:text-white/80 hover:bg-white/10"
                    : "text-stone-600 hover:text-stone-900",
                )}
              >
                {link.label}
              </StorefrontLink>
            ) : (
              <Link
                key={i}
                href={link.href}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "text-sm font-medium transition-colors duration-300",
                  useLightText
                    ? "text-white hover:text-white/80 hover:bg-white/10"
                    : "text-stone-600 hover:text-stone-900",
                )}
              >
                {link.label}
              </Link>
            ),
          )}
          <div
            className={cn(
              "mx-2 h-4 w-px",
              useLightText ? "bg-white/20" : "bg-stone-200",
            )}
          />

          {config.socialLinks.whatsapp && (
            <a
              href={`https://wa.me/${config.socialLinks.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "default" }),
                "text-white rounded-full px-5 flex items-center gap-2",
              )}
              style={{ backgroundColor: config.accentColor }}
            >
              Consultoria <ArrowUpRight size={14} />
            </a>
          )}
        </div>

        {/* Mobile Toggle */}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setOpen(!open)}
          className={cn(
            "md:hidden transition-colors duration-500",
            useLightText ? "text-white hover:bg-white/10" : "text-stone-600",
          )}
        >
          <MenuToggleIcon open={open} className="size-6" duration={300} />
        </Button>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={cn(
          "fixed inset-0 top-16 z-50 flex flex-col bg-white md:hidden",
          open ? "flex" : "hidden",
        )}
      >
        <div
          data-slot={open ? "open" : "closed"}
          className={cn(
            "flex h-full w-full flex-col justify-between gap-y-2 p-6",
            "data-[slot=open]:animate-in data-[slot=open]:fade-in data-[slot=open]:slide-in-from-top-4 duration-300",
          )}
        >
          <div className="grid gap-y-2">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  buttonVariants({
                    variant: "ghost",
                    className: "justify-start text-lg h-12",
                  }),
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3 pb-8">
            {config.socialLinks.whatsapp && (
              <a
                href={`https://wa.me/${config.socialLinks.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className={cn(
                  buttonVariants({
                    className: "w-full h-12 text-base rounded-xl text-white",
                  }),
                )}
                style={{ backgroundColor: config.brandColor }}
              >
                Falar no WhatsApp
              </a>
            )}
            <div className="flex flex-col items-center gap-1 pt-4 text-stone-400">
              <span
                className="text-sm font-bold tracking-tight"
                style={{ fontFamily: `"${config.fonts.heading}", serif` }}
              >
                {config.corretorName ?? slug}
              </span>
              <p className="text-[10px]">
                © {new Date().getFullYear()} · Centro Imóvel
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
