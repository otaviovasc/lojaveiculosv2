"use client";

import type { ComponentStyleProps, StoreConfig } from "@centroimovel/types";
import { motion, useAnimation, useInView } from "framer-motion";
import Link from "next/link";
import { useContext, useEffect, useRef } from "react";
import { getAnimationVariant, type AnimationType } from "./animation-utils";
import { PreviewDocumentContext } from "./preview-document-context";
import { SectionSurface } from "./SectionSurface";
import { defaultTextColorForTextBlock } from "./text-block-colors";

interface BuilderMarqueeProps {
  text?: string;
  speed?: "slow" | "normal" | "fast";
  direction?: "left" | "right";
  backgroundColor?: string;
  textColor?: string;
  linkUrl?: string;
  linkText?: string;
  linkType?: "internal" | "external";
  style?: ComponentStyleProps;
  config: StoreConfig;
}

const SPEED_MAP = {
  slow: 60,
  normal: 30,
  fast: 15,
};

function resolveEdgeFadeColor(
  style: ComponentStyleProps | undefined,
  brandColor: string,
): string {
  const bg = style?.background;
  if (bg?.type === "solid" && bg.solidColor) return bg.solidColor;
  if (bg?.type === "gradient" && bg.gradient?.stops?.[0]?.color) {
    return bg.gradient.stops[0].color;
  }
  return style?.backgroundColor || brandColor || "#1A1A1A";
}

export function BuilderMarquee({
  text = "Texto de exemplo passando...",
  speed = "normal",
  direction = "left",
  linkUrl,
  linkText,
  linkType = "external",
  style,
  config,
}: BuilderMarqueeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const previewDocument = useContext(PreviewDocumentContext);
  const root = previewDocument?.body;
  const isInView = useInView(ref, {
    once: true,
    ...(root ? { root } : {}),
  } as Parameters<typeof useInView>[1]);
  const controls = useAnimation();

  const resolvedTextColor =
    style?.textColor || defaultTextColorForTextBlock(style);
  const edgeFadeColor = resolveEdgeFadeColor(
    style,
    config.brandColor || "#1A1A1A",
  );

  const animationVariant = getAnimationVariant({
    animation: (style?.animation as AnimationType) || "none",
    duration: (style?.animationDuration as number) || 500,
    delay: (style?.animationDelay as number) || 0,
  });

  useEffect(() => {
    if (isInView) {
      controls.start("show");
    }
  }, [isInView, controls]);

  const duration = SPEED_MAP[speed];
  const repeatedText = Array(8).fill(text).join("  •  ");

  const hoverAnimation = style?.hoverAnimation as string;
  const hoverScale = (style?.hoverScale as number) || 1.05;

  return (
    <SectionSurface
      style={style}
      className="relative overflow-hidden py-6"
      initial="hidden"
      animate={controls}
      variants={animationVariant}
      whileHover={
        hoverAnimation === "scale"
          ? { scale: hoverScale }
          : hoverAnimation === "lift"
            ? { y: -2 }
            : hoverAnimation === "glow"
              ? { boxShadow: `0 0 20px ${config.accentColor || "#C9A84C"}` }
              : hoverAnimation === "shake"
                ? {
                    x: [-2, 2, -2, 2, 0],
                    transition: { duration: 0.3 },
                  }
                : undefined
      }
    >
      <div className="relative z-10">
        <motion.div
          className="flex whitespace-nowrap"
          animate={{
            x: direction === "left" ? [0, -1000] : [-1000, 0],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: duration,
              ease: "linear",
            },
          }}
        >
          <span
            className="flex items-center gap-12 px-4 text-2xl md:text-3xl font-bold tracking-tight uppercase"
            style={{ color: resolvedTextColor }}
          >
            {repeatedText.split("  •  ").map((segment, i) => (
              <span key={i} className="flex items-center gap-12">
                <span>{segment}</span>
                {i < 7 && (
                  <span
                    className="mx-4 opacity-30"
                    style={{ color: config.accentColor }}
                  >
                    •
                  </span>
                )}
              </span>
            ))}
          </span>
        </motion.div>

        {linkUrl && linkText && (
          <div className="absolute right-8 top-1/2 z-20 -translate-y-1/2">
            {linkType === "internal" ? (
              <Link
                href={linkUrl}
                className="rounded-full bg-white/10 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.2em] backdrop-blur-md transition-all hover:bg-white/20 hover:scale-105 border border-white/10"
                style={{ color: resolvedTextColor }}
              >
                {linkText}
              </Link>
            ) : (
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white/10 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.2em] backdrop-blur-md transition-all hover:bg-white/20 hover:scale-105 border border-white/10"
                style={{ color: resolvedTextColor }}
              >
                {linkText}
              </a>
            )}
          </div>
        )}
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-[15] w-32"
        style={{
          background: `linear-gradient(to right, ${edgeFadeColor}, transparent)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-[15] w-32"
        style={{
          background: `linear-gradient(to left, ${edgeFadeColor}, transparent)`,
        }}
      />
    </SectionSurface>
  );
}
