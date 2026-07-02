import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const checkedRoots = [
  join(root, "apps/web/src"),
  join(root, "packages/design-system/src"),
];

const ignoredFiles = ["tokens.css", "publicSite.css"];

// Color replacement mapping
const exactReplacements = [
  // Hex replacements
  [/#ed1d24\b/gi, "var(--color-accent)"],
  [/#dd242a\b/gi, "var(--color-accent-strong)"],
  [/#ef5b5b\b/gi, "var(--color-danger)"],
  [/#15222d\b/gi, "var(--color-primary)"],
  [/#5a6977\b/gi, "var(--color-muted)"],
  [/#dce4ea\b/gi, "var(--color-line)"],
  [/#b8c6d1\b/gi, "var(--color-line-strong)"],
  [/#f7f9fb\b/gi, "var(--color-app)"],
  [/#edf3f7\b/gi, "var(--color-app-elevated)"],
  [/#0b0f19\b/gi, "var(--color-app)"],
  [/#111827\b/gi, "var(--color-panel)"],
  [/#1f2937\b/gi, "var(--color-line)"],
  [/#374151\b/gi, "var(--color-line-strong)"],
  [/#ff4a51\b/gi, "var(--color-accent)"],
  [/#ff6e73\b/gi, "var(--color-accent-strong)"],
  [/#9ca3af\b/gi, "var(--color-muted)"],
  [/#f3f4f6\b/gi, "var(--color-text)"],

  // Off-brand colors mapped to brand support colors
  [/#10b981\b/gi, "var(--color-green-start)"],
  [/#059669\b/gi, "var(--color-green-end)"],
  [/#34d399\b/gi, "var(--color-green-start)"],
  [/#3b82f6\b/gi, "var(--color-blue-start)"],
  [/#1d4ed8\b/gi, "var(--color-blue-end)"],
  [/#60a5fa\b/gi, "var(--color-blue-start)"],
  [/#8b5cf6\b/gi, "var(--color-warning)"],
  [/#6d28d9\b/gi, "var(--color-warning)"],
  [/#a78bfa\b/gi, "var(--color-warning)"],
  [/#ec4899\b/gi, "var(--color-accent)"],
  [/#be185d\b/gi, "var(--color-accent-strong)"],
  [/#f472b6\b/gi, "var(--color-accent)"],
  [/#f9fbff\b/gi, "var(--color-app)"],
  [/#eef8f2\b/gi, "var(--color-app-elevated)"],
  [/#e8f4ff\b/gi, "var(--color-app-elevated)"],
  [/#bfe5cc\b/gi, "var(--color-line)"],
  [/#315c92\b/gi, "var(--color-blue-start)"],
  [/#b00020\b/gi, "var(--color-danger)"],
  [/#fff5f6\b/gi, "var(--color-accent-soft)"],
  [/#ffc7d0\b/gi, "var(--color-accent-soft)"],
  [/#9d1532\b/gi, "var(--color-accent-strong)"],

  // Rgba base conversions
  [/rgba\(\s*237\s*,\s*29\s*,\s*36\s*,/gi, "rgba(225, 31, 38,"], // Accent -> Vermelho LV base
  [/rgba\(\s*255\s*,\s*74\s*,\s*81\s*,/gi, "rgba(225, 31, 38,"],
  [/rgba\(\s*21\s*,\s*34\s*,\s*45\s*,/gi, "rgba(21, 21, 21,"], // Primary -> Carvão base
  [/rgb\(\s*21\s+34\s+45\s*\//gi, "rgb(21 21 21 /"],
  [/rgba\(\s*220\s*,\s*228\s*,\s*234\s*,/gi, "rgba(160, 152, 152,"], // Line -> Cinza Médio base
  [/rgba\(\s*245\s*,\s*197\s*,\s*66\s*,/gi, "rgba(184, 148, 24,"], // Yellow -> Âmbar base
  [/rgba\(\s*237\s*,\s*243\s*,\s*247\s*,/gi, "rgba(232, 227, 226,"], // App Elevated -> Cinza Quente base
];

function processFile(filePath) {
  let content = readFileSync(filePath, "utf8");
  let newContent = content;

  for (const [pattern, replacement] of exactReplacements) {
    newContent = newContent.replace(pattern, replacement);
  }

  if (content !== newContent) {
    console.log(`[CSS/JS] Migrated colors in ${filePath}`);
    writeFileSync(filePath, newContent, "utf8");
  }
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      if (entry !== "node_modules" && entry !== "dist") {
        walk(path);
      }
    } else {
      if (ignoredFiles.some((f) => path.endsWith(f))) {
        continue;
      }

      const name = entry.toLowerCase();
      if (
        name.endsWith(".css") ||
        name.endsWith(".tsx") ||
        name.endsWith(".ts")
      ) {
        processFile(path);
      }
    }
  }
}

console.log("Starting color migration script...");
for (const checkedRoot of checkedRoots) {
  walk(checkedRoot);
}
console.log("Color migration complete!");
