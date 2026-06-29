"use client";

import { cn } from "@/lib/utils";
import type { ComponentStyleProps, StoreConfig } from "@centroimovel/types";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import {
  auroraFadeIn,
  auroraStagger,
} from "../../templates/aurora/aurora-variants";
import { getStandardButtonStyles } from "./button-style-utils";
import { SectionSurface } from "./SectionSurface";
import { formatCssFontStack } from "./style-utils";
import { defaultTextColorForTextBlock } from "./text-block-colors";

interface HeroOverlay {
  enabled: boolean;
  type: "gradient" | "solid";
  color: string;
  opacity: number;
  gradientStops?: Array<{ color: string; position: number }>;
  gradientAngle?: number;
}

interface BuilderHeroProps {
  title?: string;
  subtitle?: string;
  imageUrl?: string | null;
  ctaLabel?: string;
  ctaUrl?: string;
  ctaLinkType?: "internal" | "external";
  buttonStyle?: "primary" | "secondary" | "outline";
  buttonColor?: string;
  buttonTextColor?: string;
  buttonBorderColor?: string;
  badge?: string;
  fullHeight?: boolean;
  overlay?: HeroOverlay;
  style?: ComponentStyleProps;
  config: StoreConfig;
  slug: string;
  onNavigate?: (href: string) => void;
}

function renderOverlayStyle(overlay?: HeroOverlay): React.CSSProperties {
  if (!overlay || !overlay.enabled) {
    return {};
  }

  if (overlay.type === "solid") {
    return {
      backgroundColor: overlay.color,
      opacity: overlay.opacity / 100,
    };
  }

  const stops = overlay.gradientStops || [
    { color: "rgba(0,0,0,0.25)", position: 0 },
    { color: "rgba(0,0,0,0.5)", position: 40 },
    { color: "rgba(0,0,0,0.85)", position: 100 },
  ];

  const gradientStops = stops
    .map((s) => `${s.color} ${s.position}%`)
    .join(", ");
  const angle = overlay.gradientAngle || 180;

  return {
    background: `linear-gradient(${angle}deg, ${gradientStops})`,
  };
}

export function BuilderHero({
  title,
  subtitle,
  imageUrl,
  ctaLabel,
  ctaUrl,
  ctaLinkType,
  buttonStyle,
  buttonColor,
  buttonTextColor,
  buttonBorderColor,
  badge,
  fullHeight = true,
  overlay,
  style,
  config,
  slug,
  onNavigate,
}: BuilderHeroProps) {
  const shouldReduceMotion = useReducedMotion();
  const heroImage = imageUrl || config.heroImageUrl || "/default-hero.jpg";
  const hasCustomBackground = Boolean(style?.background);

  const isImageBg =
    !hasCustomBackground ||
    style?.background?.type === "image" ||
    style?.background?.type === "video";
  const resolvedTextColor =
    style?.textColor ||
    (isImageBg ? "#FFFFFF" : defaultTextColorForTextBlock(style));
  const secondaryTextColor = isImageBg
    ? "rgba(255,255,255,0.92)"
    : `${resolvedTextColor}CC`;

  const handleCTAClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (ctaLinkType !== "external" && ctaUrl?.startsWith("/") && onNavigate) {
      e.preventDefault();
      onNavigate(ctaUrl);
    }
  };
  const isExternalCta =
    ctaLinkType === "external" ||
    ctaUrl?.startsWith("http://") ||
    ctaUrl?.startsWith("https://");

  const overlayStyle = renderOverlayStyle(overlay);

  const getButtonStyles = (): React.CSSProperties => {
    const accentColor = buttonColor || config.accentColor || "#C9A84C";
    const textColor = buttonTextColor || "#FFFFFF";
    const borderColor = buttonBorderColor || "#FFFFFF";
    return {
      ...getStandardButtonStyles({
        variant: buttonStyle,
        primaryColor: accentColor,
        textColor,
        borderColor,
      }),
      fontFamily: formatCssFontStack(config.fonts?.body),
    };
  };

  return (
    <SectionSurface
      style={style}
      className={fullHeight ? "min-h-screen -mt-16 pt-16" : "py-24 md:py-32"}
      innerClassName="flex flex-col items-center justify-center"
    >
      {!hasCustomBackground && (
        <div className="absolute inset-0 z-0">
          <div
            className={`absolute inset-0 scale-105 ${
              !shouldReduceMotion
                ? "will-change-transform [animation:aurora-hero-kenburns_25s_ease-in-out_infinite_alternate]"
                : ""
            }`}
          >
            <img
              src={heroImage}
              alt=""
              className="h-full w-full object-cover"
              fetchPriority="high"
            />
          </div>
          {overlay?.enabled !== false && overlay && (
            <div
              className="absolute inset-0"
              style={{
                ...overlayStyle,
                opacity:
                  overlay.type === "gradient" ? overlay.opacity / 100 : 1,
              }}
            />
          )}
        </div>
      )}

      <motion.div
        variants={shouldReduceMotion ? {} : auroraStagger(0.12, 0.25)}
        initial="hidden"
        animate="show"
        className="relative z-10 max-w-5xl space-y-8 text-center"
      >
        {badge && (
          <motion.div
            variants={auroraFadeIn("up")}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 border border-white/25 backdrop-blur-md bg-white/5 text-[11px] font-semibold tracking-[0.3em] uppercase text-white/95"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
            {badge}
          </motion.div>
        )}

        <motion.h1
          variants={auroraFadeIn("up", 0.1)}
          className={cn(
            "text-5xl font-bold tracking-tight leading-[1.02] md:text-7xl lg:text-8xl",
            isImageBg && "drop-shadow-[0_4px_30px_rgba(0,0,0,0.5)]",
          )}
          style={{
            color: resolvedTextColor,
            fontFamily: style?.fontFamily
              ? `"${style.fontFamily}", serif`
              : `"${config.fonts.heading}", serif`,
            ...(isImageBg && { textShadow: "0 2px 40px rgba(0,0,0,0.4)" }),
          }}
        >
          {title || config.heroTitle}
        </motion.h1>

        {(subtitle || config.heroSubtitle) && (
          <motion.p
            variants={auroraFadeIn("up", 0.2)}
            className={cn(
              "mx-auto max-w-2xl text-lg md:text-2xl font-light tracking-wide leading-relaxed",
              isImageBg && "drop-shadow-lg",
            )}
            style={{ color: secondaryTextColor }}
          >
            {subtitle || config.heroSubtitle}
          </motion.p>
        )}

        {ctaLabel && ctaUrl && (
          <motion.div
            variants={auroraFadeIn("up", 0.35)}
            className="pt-12 flex flex-col sm:flex-row items-center justify-center gap-5"
          >
            <Link
              href={ctaUrl}
              onClick={handleCTAClick}
              target={isExternalCta ? "_blank" : undefined}
              rel={isExternalCta ? "noopener noreferrer" : undefined}
              className="group inline-flex h-14 w-full sm:w-auto min-w-[240px] items-center justify-center gap-3 rounded-full px-10 text-[11px] font-bold uppercase tracking-[0.25em] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={getButtonStyles()}
            >
              {ctaLabel}
              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </motion.div>
        )}
      </motion.div>

      {fullHeight && isImageBg && (
        <motion.a
          href="#next"
          aria-label="Continuar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/60 hover:text-white/90 transition-colors duration-300"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] font-semibold">
            Descubra
          </span>
          <motion.span
            animate={shouldReduceMotion ? undefined : { y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown size={24} strokeWidth={2} />
          </motion.span>
        </motion.a>
      )}
    </SectionSurface>
  );
}
