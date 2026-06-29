"use client";

import { cn } from "@/lib/utils";

export type LogoVariant = "icon" | "full" | "full-white";

interface LogoProps {
  variant?: "auto" | LogoVariant;
  className?: string;
  fallbackText?: string;
  fallbackStyle?: React.CSSProperties;
}

const LOGO_PATHS = {
  icon: "/logo_centro.svg",
  full: "/logo_centro_full.svg",
  "full-white": "/logo_centro_full_white.svg",
};

export function Logo({ variant = "auto", className }: LogoProps) {
  return (
    <img
      src={LOGO_PATHS[variant === "auto" ? "full" : variant]}
      alt="Centro Imóvel"
      className={cn("h-8 w-auto object-contain", className)}
    />
  );
}

interface LogoWithVariantProps extends Omit<LogoProps, "variant"> {
  useLight?: boolean;
}

export function LogoWithVariant({ useLight, className }: LogoWithVariantProps) {
  const variant = useLight ? "full-white" : "full";
  return (
    <img
      src={LOGO_PATHS[variant]}
      alt="Centro Imóvel"
      className={cn("h-8 w-auto object-contain", className)}
    />
  );
}

interface LogoWithTextProps extends LogoWithVariantProps {
  text?: string;
  textClassName?: string;
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
      <img
        src={LOGO_PATHS[variant]}
        alt={text ?? "Centro Imóvel"}
        className={cn("h-8 w-auto object-contain", className)}
      />
      {text && (
        <span className={textClassName} style={fallbackStyle}>
          {text}
        </span>
      )}
    </div>
  );
}
