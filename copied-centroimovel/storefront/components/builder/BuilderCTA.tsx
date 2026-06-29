"use client";

import type { ComponentStyleProps, StoreConfig } from "@centroimovel/types";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useContext } from "react";
import { auroraFadeIn } from "../../templates/aurora/aurora-variants";
import { getStandardButtonStyles } from "./button-style-utils";
import { PreviewDocumentContext } from "./preview-document-context";
import { withPreviewMotionViewport } from "./preview-motion-viewport";
import { SectionSurface } from "./SectionSurface";
import { formatCssFontStack } from "./style-utils";
import { defaultTextColorForTextBlock } from "./text-block-colors";

interface BuilderCTAProps {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  buttonLinkType?: "internal" | "external";
  buttonStyle?: "primary" | "secondary" | "outline";
  buttonColor?: string;
  buttonTextColor?: string;
  buttonBorderColor?: string;
  backgroundColor?: string;
  style?: ComponentStyleProps;
  config: StoreConfig;
}

export function BuilderCTA({
  title,
  subtitle,
  buttonLabel,
  buttonUrl,
  buttonLinkType = "internal",
  buttonStyle = "primary",
  buttonColor,
  buttonTextColor,
  buttonBorderColor,
  style,
  config,
}: BuilderCTAProps) {
  const previewDocument = useContext(PreviewDocumentContext);
  const ctaViewport = withPreviewMotionViewport(previewDocument, {
    once: true,
  });
  const resolvedTextColor =
    style?.textColor || defaultTextColorForTextBlock(style);
  const fontFamily = style?.fontFamily
    ? `"${style.fontFamily}", serif`
    : `"${config.fonts.heading}", serif`;

  const isExternalUrl = (url: string) =>
    url.startsWith("http://") || url.startsWith("https://");

  const renderButton = () => {
    if (!buttonLabel || !buttonUrl) return null;

    const buttonContent = (
      <>
        {buttonLabel}
        <ArrowRight
          size={18}
          className="transition-transform group-hover:translate-x-1"
        />
      </>
    );

    const accentColor = buttonColor || config.accentColor || "#C9A84C";
    const textColor = buttonTextColor || "#FFFFFF";
    const borderColor = buttonBorderColor || "#FFFFFF";

    const buttonStyleObj = {
      ...getStandardButtonStyles({
        variant: buttonStyle,
        primaryColor: accentColor,
        textColor,
        borderColor,
      }),
      padding: "16px 40px",
      fontFamily: formatCssFontStack(config.fonts?.body),
    };

    const className =
      "group inline-flex items-center justify-center gap-3 rounded-full text-xs font-bold uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl";

    if (isExternalUrl(buttonUrl) || buttonLinkType === "external") {
      return (
        <a
          href={buttonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          style={buttonStyleObj}
        >
          {buttonContent}
        </a>
      );
    }

    return (
      <Link href={buttonUrl} className={className} style={buttonStyleObj}>
        {buttonContent}
      </Link>
    );
  };

  return (
    <SectionSurface style={style} className="px-6 py-24 md:py-32 md:px-12">
      <motion.div
        variants={auroraFadeIn("up")}
        initial="hidden"
        whileInView="show"
        viewport={ctaViewport}
        className="relative z-10 mx-auto max-w-4xl text-center"
      >
        {title && (
          <h2
            className="text-4xl md:text-6xl font-bold leading-tight mb-8 tracking-tight"
            style={{ color: resolvedTextColor, fontFamily }}
          >
            {title}
          </h2>
        )}

        {subtitle && (
          <p
            className="text-lg md:text-2xl mb-12 opacity-80 font-light leading-relaxed max-w-2xl mx-auto"
            style={{ color: resolvedTextColor, fontFamily }}
          >
            {subtitle}
          </p>
        )}

        <div className="flex justify-center">{renderButton()}</div>
      </motion.div>
    </SectionSurface>
  );
}
