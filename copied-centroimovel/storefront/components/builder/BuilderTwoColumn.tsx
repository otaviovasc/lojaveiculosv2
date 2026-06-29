"use client";

import { cn } from "@/lib/utils";
import type { ComponentStyleProps, StoreConfig } from "@centroimovel/types";
import { motion } from "framer-motion";
import type { TemplateProperty } from "../../templates/registry";
import { sectionMotionPropsFromStyle } from "./animation-utils";
import { BackgroundLayer } from "./BackgroundLayer";
import { BuilderComponentRenderer } from "./index";
import { pickBorderRadiusCascade } from "./merge-props-border-radius-cascade";
import {
  getSectionInnerChromeStyle,
  getSectionShellStyle,
} from "./style-utils";

const gapMap: Record<string, string> = {
  none: "0",
  sm: "1rem",
  md: "2rem",
  lg: "4rem",
  xl: "6rem",
};

type Nested = { type: string; props: Record<string, unknown> };

function normalizeColumnBlocks(
  children?: Nested[] | unknown,
  single?: { type?: string; props?: Record<string, unknown> } | null,
): Nested[] {
  if (Array.isArray(children) && children.length > 0) {
    return children.filter(Boolean).map((raw) => {
      const o = raw as Record<string, unknown>;
      return {
        type: String(o.type || "text_block"),
        props:
          typeof o.props === "object" && o.props !== null
            ? (o.props as Record<string, unknown>)
            : {},
      };
    });
  }
  if (single?.type) {
    return [{ type: single.type, props: single.props ?? {} }];
  }
  return [];
}

interface BuilderTwoColumnProps {
  leftContent?: { type: string; props: Record<string, unknown> };
  rightContent?: { type: string; props: Record<string, unknown> };
  leftChildren?: Nested[];
  rightChildren?: Nested[];
  leftColumnWidth?: number;
  rightColumnWidth?: number;
  gap?: "none" | "sm" | "md" | "lg" | "xl";
  reverseOnMobile?: boolean;
  leftStyle?: ComponentStyleProps;
  rightStyle?: ComponentStyleProps;
  style?: ComponentStyleProps;
  config: StoreConfig;
  slug: string;
  properties?: TemplateProperty[];
  pageBackground?: import("@centroimovel/types").BackgroundConfig;
  inheritedBorderRadius?: ComponentStyleProps["borderRadius"];
  workspaceDisplayName?: string | null;
}

function getColumnShellStyle(style?: ComponentStyleProps): React.CSSProperties {
  if (!style) return {};
  const base = getSectionShellStyle(style);
  const uni = style.background;
  const layered = uni && ["gradient", "image", "video"].includes(uni.type);
  return {
    ...base,
    ...(layered ? { backgroundColor: "transparent" } : {}),
  };
}

function mediaLayerBackground(style?: ComponentStyleProps) {
  const bg = style?.background;
  if (!bg) return undefined;
  if (["gradient", "image", "video"].includes(bg.type)) return bg;
  return undefined;
}

export function BuilderTwoColumn({
  leftContent,
  rightContent,
  leftChildren,
  rightChildren,
  leftColumnWidth = 50,
  rightColumnWidth = 50,
  gap = "lg",
  reverseOnMobile = false,
  leftStyle,
  rightStyle,
  style,
  config,
  slug,
  properties = [],
  pageBackground,
  inheritedBorderRadius,
  workspaceDisplayName,
}: BuilderTwoColumnProps) {
  const leftBlocks = normalizeColumnBlocks(leftChildren, leftContent);
  const rightBlocks = normalizeColumnBlocks(rightChildren, rightContent);

  const leftRadius = pickBorderRadiusCascade(
    inheritedBorderRadius,
    leftStyle,
    style,
  );
  const rightRadius = pickBorderRadiusCascade(
    inheritedBorderRadius,
    rightStyle,
    style,
  );
  const sectionMediaBg = mediaLayerBackground(style);
  const sectionShellStyle = getSectionShellStyle(style);
  const sectionInnerStyle = getSectionInnerChromeStyle(style);
  const gapValue = gapMap[gap];
  const motionOuter = sectionMotionPropsFromStyle(style);

  const hasCardStyle = Boolean(
    (style?.borderRadius && style.borderRadius !== "none") ||
    (style?.borderWidth && style.borderWidth > 0) ||
    (style?.shadow && style.shadow !== "none") ||
    (style?.glowIntensity && style.glowIntensity > 0),
  );

  const outerSectionStyle: React.CSSProperties = { ...sectionShellStyle };
  const innerSectionStyle: React.CSSProperties = { ...sectionInnerStyle };

  if (hasCardStyle) {
    if (sectionShellStyle.backgroundColor) {
      innerSectionStyle.backgroundColor = sectionShellStyle.backgroundColor;
      outerSectionStyle.backgroundColor = "transparent";
    }
    if (sectionShellStyle.background) {
      innerSectionStyle.background = sectionShellStyle.background;
      outerSectionStyle.background = "transparent";
    }
    if (sectionShellStyle.backgroundImage) {
      innerSectionStyle.backgroundImage = sectionShellStyle.backgroundImage;
      innerSectionStyle.backgroundSize = sectionShellStyle.backgroundSize;
      innerSectionStyle.backgroundPosition =
        sectionShellStyle.backgroundPosition;
      innerSectionStyle.backgroundRepeat = sectionShellStyle.backgroundRepeat;

      outerSectionStyle.backgroundImage = undefined;
      outerSectionStyle.backgroundSize = undefined;
      outerSectionStyle.backgroundPosition = undefined;
      outerSectionStyle.backgroundRepeat = undefined;
    }
    if (sectionShellStyle.padding) {
      innerSectionStyle.padding = sectionShellStyle.padding;
      outerSectionStyle.padding = undefined;
    }
  } else {
    if (sectionMediaBg) {
      outerSectionStyle.backgroundColor = "transparent";
    }
  }

  const layer =
    style?.background && style.background.type !== "solid" ? (
      <BackgroundLayer config={style.background} />
    ) : null;

  // Merge left styles on the inner wrapper of the column
  const leftShell = getColumnShellStyle(leftStyle);
  const leftChrome = getSectionInnerChromeStyle(leftStyle);
  const leftMergedInnerStyle: React.CSSProperties = {
    ...leftChrome,
    ...(leftShell.backgroundColor && {
      backgroundColor: leftShell.backgroundColor,
    }),
    ...(leftShell.background && { background: leftShell.background }),
    ...(leftShell.backgroundImage && {
      backgroundImage: leftShell.backgroundImage,
      backgroundSize: leftShell.backgroundSize,
      backgroundPosition: leftShell.backgroundPosition,
      backgroundRepeat: leftShell.backgroundRepeat,
    }),
    ...(leftShell.padding && { padding: leftShell.padding }),
  };

  // Merge right styles on the inner wrapper of the column
  const rightShell = getColumnShellStyle(rightStyle);
  const rightChrome = getSectionInnerChromeStyle(rightStyle);
  const rightMergedInnerStyle: React.CSSProperties = {
    ...rightChrome,
    ...(rightShell.backgroundColor && {
      backgroundColor: rightShell.backgroundColor,
    }),
    ...(rightShell.background && { background: rightShell.background }),
    ...(rightShell.backgroundImage && {
      backgroundImage: rightShell.backgroundImage,
      backgroundSize: rightShell.backgroundSize,
      backgroundPosition: rightShell.backgroundPosition,
      backgroundRepeat: rightShell.backgroundRepeat,
    }),
    ...(rightShell.padding && { padding: rightShell.padding }),
  };

  return (
    <motion.section
      className="relative overflow-hidden px-6 py-16 md:px-12"
      style={outerSectionStyle}
      {...motionOuter}
    >
      {!hasCardStyle ? layer : null}
      <div
        style={innerSectionStyle}
        className="relative z-10 mx-auto w-full max-w-7xl overflow-hidden"
      >
        {hasCardStyle ? layer : null}
        <div
          className={cn(
            "flex",
            reverseOnMobile
              ? "flex-col-reverse md:flex-row"
              : "flex-col md:flex-row",
          )}
          style={{ gap: gapValue }}
        >
          <div
            className={cn(
              "min-h-0 w-full basis-auto md:basis-[var(--col-width-left)]",
            )}
            style={
              {
                width: "100%",
                minWidth: "20%",
                "--col-width-left": `${leftColumnWidth}%`,
              } as React.CSSProperties
            }
          >
            <div
              style={leftMergedInnerStyle}
              className="relative z-10 flex min-w-0 flex-col gap-0 overflow-hidden"
            >
              {mediaLayerBackground(leftStyle) && leftStyle?.background && (
                <BackgroundLayer config={leftStyle.background} />
              )}
              {leftBlocks.length === 0 ? (
                <div className="rounded-[2rem] border-2 border-dashed border-white/5 p-12 text-center opacity-30">
                  <p className="text-xs font-bold uppercase tracking-[0.2em]">
                    Coluna esquerda vazia
                  </p>
                </div>
              ) : (
                leftBlocks.map((block, i) => (
                  <BuilderComponentRenderer
                    key={`L-${block.type}-${i}`}
                    type={block.type}
                    props={block.props}
                    config={config}
                    slug={slug}
                    properties={properties}
                    pageBackground={pageBackground}
                    inheritedBorderRadius={leftRadius}
                    workspaceDisplayName={workspaceDisplayName}
                  />
                ))
              )}
            </div>
          </div>

          <div
            className={cn(
              "min-h-0 w-full basis-auto md:basis-[var(--col-width-right)]",
            )}
            style={
              {
                width: "100%",
                minWidth: "20%",
                "--col-width-right": `${rightColumnWidth}%`,
              } as React.CSSProperties
            }
          >
            <div
              style={rightMergedInnerStyle}
              className="relative z-10 flex min-w-0 flex-col gap-0 overflow-hidden"
            >
              {mediaLayerBackground(rightStyle) && rightStyle?.background && (
                <BackgroundLayer config={rightStyle.background} />
              )}
              {rightBlocks.length === 0 ? (
                <div className="rounded-[2rem] border-2 border-dashed border-white/5 p-12 text-center opacity-30">
                  <p className="text-xs font-bold uppercase tracking-[0.2em]">
                    Coluna direita vazia
                  </p>
                </div>
              ) : (
                rightBlocks.map((block, i) => (
                  <BuilderComponentRenderer
                    key={`R-${block.type}-${i}`}
                    type={block.type}
                    props={block.props}
                    config={config}
                    slug={slug}
                    properties={properties}
                    pageBackground={pageBackground}
                    inheritedBorderRadius={rightRadius}
                    workspaceDisplayName={workspaceDisplayName}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
