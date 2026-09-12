export type StorefrontPresetKey = "aurora" | "quadra";

export type StorefrontChrome = "brand" | "dark" | "light";
export type StorefrontDensity = "airy" | "default" | "dense";
export type StorefrontMotionStyle = "dynamic" | "none" | "subtle";
export type StorefrontRadius = "pill" | "rounded" | "sharp";
export type StorefrontTypeScale = "compact" | "display" | "standard";

export type SectionType =
  "about" | "footer" | "header" | "hero" | "lead" | "stock" | "testimonials";

export type SectionCopy = Record<string, string>;

export type SectionSpec = {
  id: string;
  type: SectionType;
  variant: string;
  visible: boolean;
};

export type StorefrontTokens = {
  brand: {
    displayLine: string | null;
    displayName: string | null;
    faviconUrl: string | null;
    logoUrl: string | null;
    photoUrl: string | null;
  };
  color: {
    accent: string;
    accentStrong: string;
    chrome: StorefrontChrome;
    ink: string;
    inkMuted: string;
    surface: string;
    surfaceRaised: string;
  };
  motion: { style: StorefrontMotionStyle };
  shape: { density: StorefrontDensity; radius: StorefrontRadius };
  type: {
    bodyFont: string;
    headingFont: string;
    scale: StorefrontTypeScale;
  };
};

export type StorefrontConfig = {
  configVersion: 1;
  copy: Record<SectionType, SectionCopy>;
  preset: StorefrontPresetKey;
  sections: SectionSpec[];
  tokens: StorefrontTokens;
};
