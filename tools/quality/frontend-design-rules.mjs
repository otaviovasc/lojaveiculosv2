export const hardcodedColorPattern =
  /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/g;
export const runtimeTailwindPattern =
  /`[^`]*\$\{[^`]*(?:bg|text|border|from|to|via|ring|fill|stroke)-/g;
export const coloredShadowPattern =
  /(?<![a-zA-Z0-9-])shadow-(?!(?:sm|md|lg|xl|2xl|inner|none|black|white|gray|zinc|neutral|stone|slate|transparent)(?:\b|[\/\d-]))[a-zA-Z0-9-\/]+\b/g;

export function findFrontendDesignViolations(file, source) {
  const failures = [];
  const hardcodedColors = [...source.matchAll(hardcodedColorPattern)];
  const runtimeClasses = [...source.matchAll(runtimeTailwindPattern)];
  const coloredShadows = [...source.matchAll(coloredShadowPattern)];

  if (hardcodedColors.length > 0) {
    failures.push(
      `${file}: hardcoded color found; use design tokens/global CSS`,
    );
  }

  if (runtimeClasses.length > 0) {
    failures.push(
      `${file}: runtime-generated Tailwind color class found; use explicit variants`,
    );
  }

  if (coloredShadows.length > 0) {
    failures.push(
      `${file}: colored shadow / glow found (${coloredShadows
        .map((match) => match[0])
        .join(
          ", ",
        )}); do not use shadows with actual color, use neutral shadows or none`,
    );
  }

  return failures;
}
