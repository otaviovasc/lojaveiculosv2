import { useEffect, useMemo } from "react";

export const DEFAULT_STOREFRONT_BODY_FONT = "Plus Jakarta Sans";
export const DEFAULT_STOREFRONT_HEADING_FONT = "Bricolage Grotesque";

export const storefrontFontOptions = [
  { label: "Bricolage Grotesque", value: "Bricolage Grotesque" },
  { label: "Plus Jakarta Sans", value: "Plus Jakarta Sans" },
  { label: "Space Grotesk", value: "Space Grotesk" },
  { label: "DM Sans", value: "DM Sans" },
  { label: "Inter", value: "Inter" },
  { label: "Geist", value: "Geist" },
  { label: "Cormorant Garamond", value: "Cormorant Garamond" },
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "Poppins", value: "Poppins" },
  { label: "Fonte do sistema", value: "system-ui" },
] as const;

export function fontStack(font: string | null | undefined) {
  const normalized = normalizeStorefrontFont(
    font,
    DEFAULT_STOREFRONT_BODY_FONT,
  );
  if (normalized === "system-ui") {
    return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  }
  return `"${normalized}", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
}

export function normalizeStorefrontFont(
  font: string | null | undefined,
  fallback = DEFAULT_STOREFRONT_BODY_FONT,
) {
  const trimmed = typeof font === "string" ? font.trim() : "";
  if (!trimmed) return fallback;
  return trimmed;
}

export function StorefrontFontLinks({
  fonts,
}: {
  fonts: ReadonlyArray<string | null | undefined>;
}) {
  const href = useMemo(() => buildGoogleFontsHref(fonts), [fonts]);

  useEffect(() => {
    if (!href) return undefined;
    const id = `storefront-fonts-${hashFontHref(href)}`;
    const existing = document.getElementById(id);
    if (existing) return undefined;

    const link = document.createElement("link");
    link.id = id;
    link.href = href;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [href]);

  return null;
}

function buildGoogleFontsHref(fonts: ReadonlyArray<string | null | undefined>) {
  const families = Array.from(
    new Set(
      fonts
        .map((font) => normalizeStorefrontFont(font, ""))
        .filter((font) => font && font !== "system-ui"),
    ),
  );
  if (!families.length) return null;

  const familyParams = families
    .map(
      (font) =>
        `family=${font.replace(/\s+/g, "+")}:wght@400;500;600;700;800;900`,
    )
    .join("&");
  return `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
}

function hashFontHref(href: string) {
  let hash = 0;
  for (let index = 0; index < href.length; index += 1) {
    hash = (hash << 5) - hash + href.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
