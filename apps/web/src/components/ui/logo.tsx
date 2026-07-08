"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type LogoVariant =
  | "black"
  | "black-red"
  | "full"
  | "full-black"
  | "full-red"
  | "full-white"
  | "icon"
  | "icon-red"
  | "icon-white"
  | "red"
  | "white"
  | "white-red";

interface LogoProps {
  variant?: "auto" | LogoVariant;
  alt?: string | undefined;
  className?: string | undefined;
  fallbackText?: string | undefined;
  fallbackStyle?: CSSProperties | undefined;
  src?: string | null | undefined;
}

const LOGO_PATHS = {
  black: "/icons/lv-logo-black.svg",
  "black-red": "/icons/lv-logo-black-red.svg",
  full: "/icons/lv-logo-black-red.svg",
  "full-black": "/icons/lv-logo-black.svg",
  "full-red": "/icons/lv-logo-red.svg",
  "full-white": "/icons/lv-logo-white-red.svg",
  icon: "/icons/lv-logo-black-red.svg",
  "icon-red": "/icons/lv-logo-red.svg",
  "icon-white": "/icons/lv-logo-white-red.svg",
  red: "/icons/lv-logo-red.svg",
  white: "/icons/lv-logo-white.svg",
  "white-red": "/icons/lv-logo-white-red.svg",
};

function resolveLogoVariant(variant: "auto" | LogoVariant): LogoVariant {
  return variant === "auto" ? "full" : variant;
}

export function Logo({
  alt = "Loja Veículos",
  variant = "auto",
  className,
  src,
}: LogoProps) {
  const resolvedVariant = resolveLogoVariant(variant);
  const fallbackSrc = LOGO_PATHS[resolvedVariant];

  return (
    <img
      src={src ?? fallbackSrc}
      alt={alt}
      className={cn("h-8 w-auto object-contain", className)}
      onError={(event) => {
        if (event.currentTarget.getAttribute("src") !== fallbackSrc) {
          event.currentTarget.src = fallbackSrc;
        }
      }}
    />
  );
}

interface LogoWithVariantProps extends Omit<LogoProps, "variant"> {
  useLight?: boolean | undefined;
}

export function LogoWithVariant({ useLight, className }: LogoWithVariantProps) {
  const variant = useLight ? "full-white" : "full";
  return <Logo className={className} variant={variant} />;
}

interface LogoWithTextProps extends LogoWithVariantProps {
  text?: string | undefined;
  textClassName?: string | undefined;
}

export function LogoWithText({
  useLight,
  className,
  text,
  textClassName,
  fallbackStyle,
}: LogoWithTextProps) {
  const variant = useLight ? "full-white" : "full";

  return (
    <div className="flex items-center gap-3">
      <Logo
        alt={text ?? "Loja Veículos"}
        className={className}
        variant={variant}
      />
      {text && (
        <span className={textClassName} style={fallbackStyle}>
          {text}
        </span>
      )}
    </div>
  );
}
