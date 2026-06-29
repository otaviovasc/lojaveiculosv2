"use client";

import { cn } from "@/lib/utils";
import type {
  BackgroundConfig,
  ComponentStyleProps,
  StoreConfig,
} from "@centroimovel/types";
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

const maxWidthMap: Record<string, string> = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
  full: "100%",
};

type Nested = { type: string; props: Record<string, unknown> };

function normalizeSectionBlocks(
  children?: Nested[] | unknown,
  content?: { type?: string; props?: Record<string, unknown> } | null,
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
  if (content?.type) {
    return [
      {
        type: content.type,
        props: content.props ?? {},
      },
    ];
  }
  return [];
}

interface BuilderSectionWrapperProps {
  content?: { type: string; props: Record<string, unknown> };
  childComponents?: Nested[];
  style?: ComponentStyleProps;
  fullWidth?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  config: StoreConfig;
  slug: string;
  properties?: TemplateProperty[];
  pageBackground?: BackgroundConfig;
  inheritedBorderRadius?: ComponentStyleProps["borderRadius"];
  workspaceDisplayName?: string | null;
}

export function BuilderSectionWrapper({
  content,
  childComponents: childrenProp,
  style,
  fullWidth = false,
  maxWidth = "lg",
  config,
  slug,
  properties = [],
  pageBackground,
  inheritedBorderRadius,
  workspaceDisplayName,
}: BuilderSectionWrapperProps) {
  const blocks = normalizeSectionBlocks(childrenProp, content);
  const radiusForChild = pickBorderRadiusCascade(inheritedBorderRadius, style);
  const maxW = maxWidthMap[maxWidth];
  const bgConfig = style?.background;

  const showBackgroundLayer = bgConfig && bgConfig.type !== "solid";
  const usesMediaLayer =
    bgConfig !== undefined &&
    ["gradient", "image", "video"].includes(bgConfig.type);

  const sectionShellStyle = getSectionShellStyle(style);
  const sectionInnerChrome = getSectionInnerChromeStyle(style);

  const hasCardStyle = Boolean(
    (style?.borderRadius && style.borderRadius !== "none") ||
    (style?.borderWidth && style.borderWidth > 0) ||
    (style?.shadow && style.shadow !== "none") ||
    (style?.glowIntensity && style.glowIntensity > 0),
  );

  const outerStyle: React.CSSProperties = { ...sectionShellStyle };
  const innerStyle: React.CSSProperties = {
    ...sectionInnerChrome,
    maxWidth: fullWidth ? "none" : maxW,
    padding: fullWidth ? "0" : undefined,
  };

  if (hasCardStyle) {
    if (sectionShellStyle.backgroundColor) {
      innerStyle.backgroundColor = sectionShellStyle.backgroundColor;
      outerStyle.backgroundColor = "transparent";
    }
    if (sectionShellStyle.background) {
      innerStyle.background = sectionShellStyle.background;
      outerStyle.background = "transparent";
    }
    if (sectionShellStyle.backgroundImage) {
      innerStyle.backgroundImage = sectionShellStyle.backgroundImage;
      innerStyle.backgroundSize = sectionShellStyle.backgroundSize;
      innerStyle.backgroundPosition = sectionShellStyle.backgroundPosition;
      innerStyle.backgroundRepeat = sectionShellStyle.backgroundRepeat;

      outerStyle.backgroundImage = undefined;
      outerStyle.backgroundSize = undefined;
      outerStyle.backgroundPosition = undefined;
      outerStyle.backgroundRepeat = undefined;
    }
    if (sectionShellStyle.padding) {
      innerStyle.padding = sectionShellStyle.padding;
      outerStyle.padding = undefined;
    }
  } else {
    if (usesMediaLayer) {
      outerStyle.backgroundColor = "transparent";
    }
  }

  const layer =
    bgConfig && bgConfig.type !== "solid" ? (
      <BackgroundLayer config={bgConfig} />
    ) : null;

  const motionOuter = sectionMotionPropsFromStyle(style);

  return (
    <motion.section
      style={outerStyle}
      className="relative w-full overflow-hidden py-16"
      {...motionOuter}
    >
      {!hasCardStyle ? layer : null}

      <div
        className={cn(
          "relative z-10 overflow-hidden",
          fullWidth ? "w-full" : "mx-auto",
        )}
        style={innerStyle}
      >
        {hasCardStyle ? layer : null}
        {blocks.length === 0 ? (
          <div className="p-12 text-center opacity-30 border-2 border-dashed border-white/5 rounded-[2rem]">
            <p className="text-xs font-bold uppercase tracking-[0.2em]">
              Seção vazia — adicione conteúdo
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0">
            {blocks.map((block, i) => (
              <BuilderComponentRenderer
                key={`${block.type}-${i}`}
                type={block.type}
                props={block.props}
                config={config}
                slug={slug}
                properties={properties}
                pageBackground={pageBackground}
                inheritedBorderRadius={radiusForChild}
                workspaceDisplayName={workspaceDisplayName}
              />
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}
