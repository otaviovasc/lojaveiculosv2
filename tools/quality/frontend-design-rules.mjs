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

// Approved brand color components in RGB
export const approvedBaseColors = [
  [21, 21, 21], // Carvão #151515
  [42, 36, 36], // Escuro Quente #2a2424
  [74, 68, 68], // Chumbo #4a4444
  [160, 152, 152], // Cinza Médio #a09898
  [232, 227, 226], // Cinza Quente #e8e3e2
  [244, 239, 238], // Off-white #f4efee
  [140, 17, 24], // Vermelho Deep #8c1118
  [184, 24, 32], // Vermelho Hover #b81820
  [225, 31, 38], // Vermelho LV #e11f26
  [252, 232, 233], // Vermelho Claro #fce8e9
  [24, 42, 184], // Azul Info #182ab8
  [24, 184, 65], // Verde Sucesso #18b841
  [184, 148, 24], // Âmbar Aviso #b89418
  [255, 255, 255], // White #ffffff
  [0, 0, 0], // Black #000000

  // Allowed Support Neutrals (for shadows, secondary overlays, borders)
  [17, 24, 39], // dark slate background
  [55, 65, 81], // mid-gray slate
  [203, 213, 225], // slate border #cbd5e1
  [226, 232, 240], // slate divider #e2e8f0
  [30, 41, 59], // slate text/panel #1e293b
  [9, 9, 11], // zinc-950 #09090b
  [39, 39, 42], // zinc-800 #27272a

  // Allowed Warning & Alert Yellows/Ambers (for ratings, warning states)
  [253, 224, 71], // yellow-300 #fde047
  [250, 204, 21], // yellow-400 #facc15
  [234, 179, 8], // yellow-500 #eab308
  [217, 119, 6], // amber-600 #d97706
  [180, 83, 9], // amber-700 #b45309
  [254, 243, 199], // amber-50 #fef3c7
  [245, 197, 66], // warning #f5c542
  [59, 32, 0], // dark amber #3b2000

  // Allowed Functional Greens (Success/status indicators)
  [16, 185, 129], // emerald-500 #10b981
  [5, 150, 105], // emerald-600 #059669
  [52, 211, 153], // emerald-400 #34d399
  [32, 199, 122], // status green #20c77a
  [8, 122, 47], // accessible green text on light surfaces #087a2f
  [6, 101, 37], // accessible green text on translucent light surfaces #066525
  [114, 223, 145], // accessible green text on dark surfaces #72df91

  // Allowed Functional Blues (Info/status indicators)
  [59, 130, 246], // blue-500 #3b82f6
  [29, 78, 216], // blue-700 #1d4ed8
  [96, 165, 250], // blue-400 #60a5fa

  // Accessible semantic text variants for warning states
  [118, 91, 0], // accessible amber text on light surfaces #765b00
  [234, 209, 110], // accessible amber text on dark surfaces #ead16e
];

function hexToRgb(hex) {
  let clean = hex.replace("#", "").toLowerCase();
  if (clean.length === 3 || clean.length === 4) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  } else if (clean.length === 8) {
    clean = clean.substring(0, 6);
  }
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

export function isColorApproved(colorStr) {
  const trimmed = colorStr.trim().toLowerCase();

  if (trimmed.startsWith("#")) {
    try {
      const [r, g, b] = hexToRgb(trimmed);
      return approvedBaseColors.some(
        ([ar, ag, ab]) => ar === r && ag === g && ab === b,
      );
    } catch {
      return false;
    }
  }

  const rgbMatch = trimmed.match(/^rgba?\s*\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return approvedBaseColors.some(
      ([ar, ag, ab]) => ar === r && ag === g && ab === b,
    );
  }

  return false;
}

export function findFrontendDesignViolations(file, source) {
  const failures = [];
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
    // 1. Check for hardcoded colors
    const hardcodedColors = [...source.matchAll(hardcodedColorPattern)];
    if (hardcodedColors.length > 0) {
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
