"use client";

import { cn } from "@/lib/utils";
import type { ComponentStyleProps } from "@centroimovel/types";
import { motion, type HTMLMotionProps } from "framer-motion";
import type { ElementType, ReactNode } from "react";
import { useContext } from "react";
import { sectionMotionPropsFromStyle } from "./animation-utils";
import { BackgroundLayer } from "./BackgroundLayer";
import { PreviewDocumentContext } from "./preview-document-context";
import { withPreviewMotionViewport } from "./preview-motion-viewport";
import {
  getSectionInnerChromeStyle,
  getSectionShellStyle,
} from "./style-utils";

type SectionSurfaceProps = {
  style?: ComponentStyleProps;
  className?: string;
  innerClassName?: string;
  as?: ElementType;
  children: ReactNode;
} & Partial<
  Pick<
    HTMLMotionProps<"div">,
    | "initial"
    | "animate"
    | "variants"
    | "whileHover"
    | "whileInView"
    | "viewport"
    | "exit"
    | "transition"
  >
>;

/** Strip legacy cover URL so opacity can apply on a dedicated layer (text stays opaque). */
function styleWithoutLegacyCoverImage(
  style?: ComponentStyleProps,
): ComponentStyleProps | undefined {
  if (!style?.backgroundImageUrl || style.background) return style;
  return { ...style, backgroundImageUrl: undefined };
}

/**
 * Section chrome: applies `getBaseSectionStyle`, unified `style.background`,
 * optional legacy image + opacity layer, and style-driven motion on the inner
 * wrapper.
 */
export function SectionSurface({
  style,
  className,
  innerClassName,
  as: Root = "section",
  children,
  ...props
}: SectionSurfaceProps) {
  const forBase = styleWithoutLegacyCoverImage(style);
  const shellStyle = getSectionShellStyle(forBase);
  const innerChromeStyle = getSectionInnerChromeStyle(forBase);
  const bg = style?.background;
  const layered =
    bg !== undefined &&
    ["gradient", "image", "video"].includes(bg.type as string);
  const legacyUrl =
    style?.backgroundImageUrl && !style?.background && !style?.gradient;
  const legacyOpacity =
    (style?.backgroundImageOpacity != null
      ? style.backgroundImageOpacity
      : 100) / 100;
  const motionInner = sectionMotionPropsFromStyle(style);
  const previewDocument = useContext(PreviewDocumentContext);
  const baseViewport = props.viewport ?? motionInner.viewport;
  const resolvedViewport = withPreviewMotionViewport(
    previewDocument,
    baseViewport,
  );

  const hasCardStyle = Boolean(
    (style?.borderRadius && style.borderRadius !== "none") ||
    (style?.borderWidth && style.borderWidth > 0) ||
    (style?.shadow && style.shadow !== "none") ||
    (style?.glowIntensity && style.glowIntensity > 0),
  );

  const outerStyle: React.CSSProperties = { ...shellStyle };
  const innerStyle: React.CSSProperties = { ...innerChromeStyle };

  if (hasCardStyle) {
    if (shellStyle.backgroundColor) {
      innerStyle.backgroundColor = shellStyle.backgroundColor;
      outerStyle.backgroundColor = "transparent";
    }
    if (shellStyle.background) {
      innerStyle.background = shellStyle.background;
      outerStyle.background = "transparent";
    }
    if (shellStyle.backgroundImage) {
      innerStyle.backgroundImage = shellStyle.backgroundImage;
      innerStyle.backgroundSize = shellStyle.backgroundSize;
      innerStyle.backgroundPosition = shellStyle.backgroundPosition;
      innerStyle.backgroundRepeat = shellStyle.backgroundRepeat;

      outerStyle.backgroundImage = undefined;
      outerStyle.backgroundSize = undefined;
      outerStyle.backgroundPosition = undefined;
      outerStyle.backgroundRepeat = undefined;
    }
    if (shellStyle.padding) {
      innerStyle.padding = shellStyle.padding;
      outerStyle.padding = undefined;
    }
  } else {
    if (layered) {
      outerStyle.backgroundColor = "transparent";
    }
  }

  const mediaBg = (
    <>
      {layered ? <BackgroundLayer config={bg} /> : null}
      {legacyUrl ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${String(style.backgroundImageUrl)})`,
            opacity: legacyOpacity,
          }}
        />
      ) : null}
    </>
  );

  return (
    <Root
      className={cn("relative overflow-hidden", className)}
      style={outerStyle}
    >
      {!hasCardStyle ? mediaBg : null}
      <motion.div
        className={cn(
          "relative z-10 min-h-full w-full overflow-hidden",
          innerClassName,
        )}
        style={innerStyle}
        {...motionInner}
        initial={props.initial ?? motionInner.initial}
        animate={props.animate ?? motionInner.animate}
        variants={props.variants ?? motionInner.variants}
        whileHover={props.whileHover ?? motionInner.whileHover}
        whileInView={props.whileInView ?? motionInner.whileInView}
        viewport={resolvedViewport}
        exit={props.exit}
        transition={props.transition}
      >
        {hasCardStyle ? mediaBg : null}
        {children}
      </motion.div>
    </Root>
  );
}
