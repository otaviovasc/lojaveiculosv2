import type { CSSProperties } from "react";
import type {
  StorefrontBuilderComponent,
  StorefrontBuilderStyle,
} from "@lojaveiculosv2/shared";
import { fontStack } from "./storefrontFonts";

export function createPageBuilderBlockStyle(
  component: StorefrontBuilderComponent,
) {
  const style = toRecord(component.props.style) as StorefrontBuilderStyle;
  const css: CSSProperties & Record<`--${string}`, string> = {};

  const backgroundColor = stringValue(style.backgroundColor);
  if (backgroundColor) {
    css.backgroundColor = backgroundColor;
    css["--color-app"] = backgroundColor;
    css["--color-panel"] = backgroundColor;
  }
  assignString(css, "borderColor", style.borderColor);
  assignString(css, "borderRadius", style.borderRadius);
  const textColor = stringValue(style.textColor);
  if (textColor) {
    css.color = textColor;
    css["--color-muted"] = textColor;
    css["--color-text"] = textColor;
  }
  assignString(css, "fontSize", style.fontSize);
  assignString(css, "margin", style.margin);
  assignString(css, "maxHeight", style.maxHeight);
  assignString(css, "minHeight", style.minHeight);
  assignString(css, "padding", style.padding);

  const fontFamily = stringValue(style.fontFamily);
  if (fontFamily) {
    const stack = fontStack(fontFamily);
    css.fontFamily = stack;
    css["--page-builder-heading-font"] = stack;
  }

  if (typeof style.borderWidth === "number") {
    css.borderWidth = style.borderWidth;
    css.borderStyle = style.borderWidth > 0 ? "solid" : undefined;
  }
  if (style.maxHeight) css.overflow = "auto";
  if (style.shadow) css.boxShadow = shadowValue(style.shadow);
  if (isTextAlign(style.textAlign)) css.textAlign = style.textAlign;

  const animationName = animationValue(style.animation);
  if (animationName) {
    css.animationName = animationName;
    css.animationDuration = `${style.animationDuration ?? 0.5}s`;
    css.animationDelay = `${style.animationDelay ?? 0}s`;
    css.animationFillMode = "both";
    css.animationTimingFunction = "ease";
  }

  return Object.keys(css).length ? css : null;
}

export function collectPageBuilderFonts(
  components: readonly StorefrontBuilderComponent[],
) {
  const fonts = new Set<string>();
  for (const component of components) {
    const font = stringValue(toRecord(component.props.style).fontFamily);
    if (font) fonts.add(font);
    collectNestedFonts(component.props, fonts);
  }
  return Array.from(fonts);
}

function collectNestedFonts(
  props: Record<string, unknown>,
  fonts: Set<string>,
) {
  for (const value of Object.values(props)) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (!isComponentLike(item)) continue;
      const font = stringValue(toRecord(item.props.style).fontFamily);
      if (font) fonts.add(font);
      collectNestedFonts(item.props, fonts);
    }
  }
}

function assignString(
  target: CSSProperties,
  key: keyof CSSProperties,
  value: unknown,
) {
  const string = stringValue(value);
  if (string) target[key] = string as never;
}

function animationValue(value: unknown) {
  if (value === "fade-in") return "page-builder-style-fade-in";
  if (value === "slide-up") return "page-builder-style-slide-up";
  if (value === "zoom-in") return "page-builder-style-zoom-in";
  return null;
}

function shadowValue(value: string) {
  if (value === "sm")
    return "0 8px 24px color-mix(in oklab, var(--color-text) 10%, transparent)";
  if (value === "md")
    return "0 14px 40px color-mix(in oklab, var(--color-text) 14%, transparent)";
  if (value === "lg")
    return "0 24px 70px color-mix(in oklab, var(--color-text) 18%, transparent)";
  if (value === "glow")
    return "0 0 0 1px var(--color-accent), 0 18px 54px color-mix(in oklab, var(--color-accent) 24%, transparent)";
  return undefined;
}

function isTextAlign(value: unknown): value is "center" | "left" | "right" {
  return value === "center" || value === "left" || value === "right";
}

function isComponentLike(value: unknown): value is StorefrontBuilderComponent {
  const record = toRecord(value);
  return (
    typeof record.id === "string" &&
    typeof record.order === "number" &&
    typeof record.type === "string" &&
    typeof record.visible === "boolean" &&
    Boolean(record.props && typeof record.props === "object")
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
