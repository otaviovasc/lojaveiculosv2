import { isColorApproved } from "./frontend-design-colors.mjs";

// Partner marketplace portals render third-party logos and brand colours
// (iCarros orange, OLX teal, Webmotors blue, Mercado Livre indigo) that
// legitimately fall outside the store's approved palette — you cannot recolour
// a partner's logo. Exempt only these specific assets from the brand-palette
// checks; every other design rule still applies to them.
const partnerPortalBrandAssets = [
  "/apps/web/public/icons/portals/",
  "/features/inventory/components/InventoryDetailPortaisSection.tsx",
];

function isPartnerPortalBrandAsset(file) {
  return partnerPortalBrandAssets.some((part) => file.includes(part));
}

export const hardcodedColorPattern =
  /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\([^)]*\)|\bhsla?\s*\([^)]*\)/g;
export const runtimeTailwindPattern =
  /`[^`]*\$\{[^`]*(?:bg|text|border|from|to|via|ring|fill|stroke)-/g;
export const coloredShadowPattern =
  /(?<![a-zA-Z0-9-])shadow-(?!(?:sm|md|lg|xl|2xl|inner|none|black|white|gray|zinc|neutral|stone|slate|transparent)(?:\b|[\/\d-]))[a-zA-Z0-9-\/]+\b/g;

// Match arbitrary font-size declarations in CSS (excluding var() and standard keywords)
export const cssFontSizePattern = /font-size:\s*([^;!]+)/g;

// Match arbitrary Tailwind text bracket sizes in JSX/TSX (excluding var() references)
export const arbitraryTextSizePattern = /text-\[(\d+\.?\d*)(px|rem|em)?\]/g;

// Match inline React style for font size (e.g., fontSize: "14px" or fontSize: 14)
export const inlineFontSizePattern =
  /fontSize:\s*['"`]?(\d+\.?\d*)(px|rem|em)?['"`]?/g;

export function findFrontendDesignViolations(file, source) {
  const failures = [];
  const isPartnerPortalAsset = isPartnerPortalBrandAsset(file);
  if (file.endsWith(".svg")) {
    if (isPartnerPortalAsset) return failures;
    for (const match of source.matchAll(hardcodedColorPattern)) {
      if (!isColorApproved(match[0])) {
        failures.push(
          `${file}: SVG color "${match[0]}" is outside the approved brand palette.`,
        );
      }
    }
    return failures;
  }
  const isCssFile = file.endsWith(".css");
  const isThemeFile =
    file.endsWith("tokens.css") || file.endsWith("publicSite.css");

  if (isCssFile) {
    if (isThemeFile) {
      // Check that all raw color values defined in tokens/publicSite belong strictly to the brand palette
      const colors = [...source.matchAll(hardcodedColorPattern)];
      for (const match of colors) {
        if (!isColorApproved(match[0])) {
          failures.push(
            `${file}: color "${match[0]}" is outside the approved brand palette. Please restrict styling to the approved brand palette.`,
          );
        }
      }
    } else {
      // Check for raw/hardcoded font-sizes in custom CSS files
      const fontSizes = [...source.matchAll(cssFontSizePattern)];
      for (const match of fontSizes) {
        const trimmed = match[1].trim();
        if (/\b\d+(\.\d+)?(px|rem|em)\b/.test(trimmed)) {
          failures.push(
            `${file}: hardcoded font-size "${match[0]}" found; use CSS variables like "var(--font-size-sm)" or dynamic Tailwind utility classes instead.`,
          );
        }
      }
    }
  } else {
    // JS/TS/JSX/TSX Files
    // 1. Check for hardcoded colors (partner-portal brand assets are exempt)
    const hardcodedColors = [...source.matchAll(hardcodedColorPattern)];
    if (!isPartnerPortalAsset && hardcodedColors.length > 0) {
      failures.push(
        `${file}: hardcoded color found; use design tokens / global CSS instead of raw color codes.`,
      );
    }

    // 2. Check for runtime tailwind color classes
    const runtimeClasses = [...source.matchAll(runtimeTailwindPattern)];
    if (runtimeClasses.length > 0) {
      failures.push(
        `${file}: runtime-generated Tailwind color class found; use explicit variants.`,
      );
    }

    // 3. Check for colored shadows
    const coloredShadows = [...source.matchAll(coloredShadowPattern)];
    if (coloredShadows.length > 0) {
      failures.push(
        `${file}: colored shadow / glow found (${coloredShadows
          .map((match) => match[0])
          .join(
            ", ",
          )}); do not use shadows with actual color, use neutral shadows or none.`,
      );
    }

    // 4. Check for arbitrary text size bracket classes (e.g. text-[12px], text-[1rem])
    const arbitraryTextSizes = [...source.matchAll(arbitraryTextSizePattern)];
    if (arbitraryTextSizes.length > 0) {
      failures.push(
        `${file}: arbitrary Tailwind text size class "${arbitraryTextSizes[0][0]}" found; always use dynamic Tailwind sizing classes (text-xs, text-sm, text-base, text-lg, etc.) to ensure theme compliance.`,
      );
    }

    // 5. Check for React inline style font sizes
    const inlineFontSizes = [...source.matchAll(inlineFontSizePattern)];
    if (inlineFontSizes.length > 0) {
      failures.push(
        `${file}: inline style fontSize "${inlineFontSizes[0][0]}" found; use Tailwind sizing classes or custom className rules instead.`,
      );
    }
  }

  return failures;
}
