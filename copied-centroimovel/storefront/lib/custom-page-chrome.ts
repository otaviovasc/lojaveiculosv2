import type { PageChrome } from "@centroimovel/types";
import type { CSSProperties } from "react";

/** `fixed` for published page; `sticky` inside the admin preview canvas. */
export type CustomPageHeaderPosition = "fixed" | "sticky";

export function customPageHeaderPositionClass(
  position: CustomPageHeaderPosition,
): string {
  return position === "fixed"
    ? "fixed top-0 left-0 right-0 z-40"
    : "sticky top-0 z-40";
}

export function customPageHeaderRowClass(chrome?: PageChrome | null): string {
  const variant = chrome?.headerVariant ?? "minimal";
  const base =
    "flex w-full items-center justify-between border-b px-4 py-3 backdrop-blur-md";
  if (variant === "solid") {
    return `${base} border-black/10`;
  }
  if (variant === "glass") {
    return `${base} border-white/15 bg-white/35`;
  }
  return `${base} border-black/5 bg-white/80`;
}

export function customPageHeaderRowStyle(
  chrome?: PageChrome | null,
): CSSProperties {
  if (chrome?.headerVariant === "solid") {
    return {
      backgroundColor: chrome.headerBgColor || "#ffffff",
      backdropFilter: undefined,
    };
  }
  return {};
}

export function customPageMainPaddingClass(
  position: CustomPageHeaderPosition,
): string {
  return position === "fixed" ? "pt-16" : "pt-0";
}
