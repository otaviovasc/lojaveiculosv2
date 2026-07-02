import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const checkedRoots = [
  join(root, "apps/web/src"),
  join(root, "packages/design-system/src"),
];

const ignoredFiles = ["tokens.css", "publicSite.css"];

// Map font sizes in pixels to their closest CSS variable
function mapPxToVariable(px) {
  if (px <= 12) return "var(--font-size-xs)"; // 10px
  if (px <= 17) return "var(--font-size-sm)"; // 15px
  if (px <= 22) return "var(--font-size-lg)"; // 20px
  if (px <= 27) return "var(--font-size-xl)"; // 25px
  if (px <= 32) return "var(--font-size-2xl)"; // 30px
  if (px <= 37) return "var(--font-size-3xl)"; // 35px
  if (px <= 42) return "var(--font-size-4xl)"; // 40px
  return "var(--font-size-5xl)"; // 50px
}

// Map font sizes in pixels to their closest Tailwind text class
function mapPxToTailwindClass(px) {
  if (px <= 12) return "text-xs"; // 10px
  if (px <= 17) return "text-sm"; // 15px
  if (px <= 22) return "text-lg"; // 20px
  if (px <= 27) return "text-xl"; // 25px
  if (px <= 32) return "text-2xl"; // 30px
  if (px <= 37) return "text-3xl"; // 35px
  if (px <= 42) return "text-4xl"; // 40px
  return "text-5xl"; // 50px
}

function processCssFile(filePath) {
  const content = readFileSync(filePath, "utf8");

  // Match font-size: <value> (ignoring var(...) and standard keywords)
  const newContent = content.replace(/font-size:\s*([^;!]+)/g, (match, val) => {
    const trimmed = val.trim();
    if (trimmed.startsWith("var(") || /^[a-z-]+$/.test(trimmed)) {
      return match;
    }

    // Parse pixels
    const pxMatch = trimmed.match(/^([\d.]+)\s*px$/);
    if (pxMatch) {
      const px = parseFloat(pxMatch[1]);
      const variable = mapPxToVariable(px);
      console.log(
        `[CSS] Replacing "${match}" with "font-size: ${variable}" in ${filePath}`,
      );
      return `font-size: ${variable}`;
    }

    // Parse rem
    const remMatch = trimmed.match(/^([\d.]+)\s*rem$/);
    if (remMatch) {
      const rem = parseFloat(remMatch[1]);
      const px = rem * 16;
      const variable = mapPxToVariable(px);
      console.log(
        `[CSS] Replacing "${match}" with "font-size: ${variable}" in ${filePath}`,
      );
      return `font-size: ${variable}`;
    }

    // Parse em
    const emMatch = trimmed.match(/^([\d.]+)\s*em$/);
    if (emMatch) {
      const em = parseFloat(emMatch[1]);
      const px = em * 16;
      const variable = mapPxToVariable(px);
      console.log(
        `[CSS] Replacing "${match}" with "font-size: ${variable}" in ${filePath}`,
      );
      return `font-size: ${variable}`;
    }

    return match;
  });

  if (content !== newContent) {
    writeFileSync(filePath, newContent, "utf8");
  }
}

function processJsxFile(filePath) {
  const content = readFileSync(filePath, "utf8");

  // Match text-[<value>] patterns in classNames
  const newContent = content.replace(
    /text-\[(\d+\.?\d*)(px|rem|em)\]/g,
    (match, val, unit) => {
      const num = parseFloat(val);
      const px = unit === "px" ? num : num * 16;
      const replacement = mapPxToTailwindClass(px);
      console.log(
        `[JSX] Replacing "${match}" with "${replacement}" in ${filePath}`,
      );
      return replacement;
    },
  );

  if (content !== newContent) {
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
      const name = entry.toLowerCase();
      if (ignoredFiles.some((f) => path.endsWith(f))) {
        continue;
      }

      if (name.endsWith(".css")) {
        processCssFile(path);
      } else if (
        name.endsWith(".tsx") ||
        name.endsWith(".ts") ||
        name.endsWith(".jsx") ||
        name.endsWith(".js")
      ) {
        processJsxFile(path);
      }
    }
  }
}

console.log("Starting font size migration script...");
for (const checkedRoot of checkedRoots) {
  walk(checkedRoot);
}
console.log("Migration complete!");
