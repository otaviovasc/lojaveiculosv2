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
  sm: "0.5rem",
  md: "1rem",
  lg: "2rem",
  xl: "3rem",
};

interface BuilderContainerProps {
  childComponents?: Array<{ type: string; props: Record<string, unknown> }>;
  layout?: "stack" | "grid" | "flex";
  direction?: "row" | "column";
  gap?: "none" | "sm" | "md" | "lg" | "xl";
  alignItems?: "start" | "center" | "end" | "stretch";
  justifyContent?: "start" | "center" | "end" | "between" | "around";
  minHeight?: string;
  style?: ComponentStyleProps;
  config: StoreConfig;
  slug: string;
  properties?: TemplateProperty[];
  pageBackground?: import("@centroimovel/types").BackgroundConfig;
  inheritedBorderRadius?: ComponentStyleProps["borderRadius"];
  workspaceDisplayName?: string | null;
}

function getLayoutClass(layout: string, direction: string): string {
  if (layout === "grid")
    return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  if (layout === "flex")
    return direction === "row" ? "flex flex-row flex-wrap" : "flex flex-col";
  return "flex flex-col";
}

const alignMap: Record<string, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

const justifyMap: Record<string, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
};

function normalizeAlignItems(value: string): keyof typeof alignMap {
  if (value === "flex-start") return "start";
  if (value === "flex-end") return "end";
  if (value in alignMap) return value as keyof typeof alignMap;
  return "stretch";
}

function normalizeJustifyContent(value: string): keyof typeof justifyMap {
  if (value === "flex-start") return "start";
  if (value === "flex-end") return "end";
  if (value === "space-between") return "between";
  if (value === "space-around") return "around";
  if (value in justifyMap) return value as keyof typeof justifyMap;
  return "start";
}

function containerHasMediaBackground(style?: ComponentStyleProps) {
  const bg = style?.background;
  return Boolean(bg && ["gradient", "image", "video"].includes(bg.type));
}

export function BuilderContainer({
  childComponents = [],
  layout = "stack",
  direction = "column",
  gap = "md",
  alignItems = "start",
  justifyContent = "start",
  minHeight,
  style,
  config,
  slug,
  properties = [],
  pageBackground,
  inheritedBorderRadius,
  workspaceDisplayName,
}: BuilderContainerProps) {
  const radiusForChildren = pickBorderRadiusCascade(
    inheritedBorderRadius,
    style,
  );
  const hasMediaBg = containerHasMediaBackground(style);
  const shellStyle = getSectionShellStyle(style);
  const innerChromeStyle = getSectionInnerChromeStyle(style);

  const hasCardStyle = Boolean(
    (style?.borderRadius && style.borderRadius !== "none") ||
    (style?.borderWidth && style.borderWidth > 0) ||
    (style?.shadow && style.shadow !== "none") ||
    (style?.glowIntensity && style.glowIntensity > 0),
  );

  const outerStyle: React.CSSProperties = {
    ...shellStyle,
    minHeight,
  };
  const innerStyle: React.CSSProperties = {
    ...innerChromeStyle,
    gap: gapMap[gap],
  };

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
    if (hasMediaBg) {
      outerStyle.backgroundColor = "transparent";
    }
  }

  const layer =
    style?.background && style.background.type !== "solid" ? (
      <BackgroundLayer config={style.background} />
    ) : null;
  const motionProps = sectionMotionPropsFromStyle(style);

  if (childComponents.length === 0) {
    return (
      <motion.div
        style={outerStyle}
        className="relative overflow-hidden"
        {...motionProps}
      >
        {!hasCardStyle ? layer : null}
        <div
          style={innerStyle}
          className="relative z-10 min-h-full w-full overflow-hidden border-2 border-dashed border-white/5 p-12"
        >
          {hasCardStyle ? layer : null}
          <div className="text-center opacity-30 py-12">
            <p className="text-xs font-bold uppercase tracking-[0.2em]">
              Container vazio — adicione componentes
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      style={outerStyle}
      className="relative overflow-hidden"
      {...motionProps}
    >
      {!hasCardStyle ? layer : null}
      <div
        style={innerStyle}
        className={cn(
          "relative z-10 min-h-full w-full overflow-hidden",
          getLayoutClass(layout, direction),
          alignMap[normalizeAlignItems(alignItems)],
          justifyMap[normalizeJustifyContent(justifyContent)],
        )}
      >
        {hasCardStyle ? layer : null}
        {childComponents.map((child, index) => (
          <div
            key={`${child.type}-${index}`}
            className={cn(
              "relative z-10",
              layout === "grid" ? "min-w-0" : "min-w-[200px]",
            )}
            style={{
              ...(layout === "stack"
                ? { width: "100%" }
                : layout === "flex"
                  ? { flex: "1 1 200px" }
                  : {}),
            }}
          >
            <BuilderComponentRenderer
              type={child.type}
              props={child.props}
              config={config}
              slug={slug}
              properties={properties}
              pageBackground={pageBackground}
              inheritedBorderRadius={radiusForChildren}
              workspaceDisplayName={workspaceDisplayName}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
