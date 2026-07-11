import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const repoRoot = new URL("../../", import.meta.url).pathname;
const root = join(repoRoot, "apps/api/src/domains");
const forbiddenPackages = [
  /^hono(?:\/|$)/,
  /^drizzle-orm(?:\/|$)/,
  /^pino(?:\/|$)/,
  /^@clerk(?:\/|$)/,
  /^express(?:\/|$)/,
  /^next\//,
];
const forbiddenRepoPaths = [
  "apps/api/src/features/",
  "apps/api/src/infrastructure/",
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      walk(path, files);
    } else if (path.endsWith(".ts") || path.endsWith(".tsx")) {
      files.push(path);
    }
  }

  return files;
}

const offenders = walk(root).flatMap((file) => {
  const source = readFileSync(file, "utf8");
  return extractImportSpecifiers(source)
    .map((specifier) => ({
      file,
      specifier,
      target: normalizeImportTarget(file, specifier),
    }))
    .filter(({ specifier, target }) => forbiddenImport(specifier, target));
});

if (offenders.length > 0) {
  console.error("Domain boundary violations:");
  for (const offender of offenders) {
    console.error(`${offender.file}: ${offender.specifier}`);
  }
  process.exit(1);
}

function extractImportSpecifiers(source) {
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  return patterns.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[1]),
  );
}

function normalizeImportTarget(file, specifier) {
  if (!specifier.startsWith(".")) return specifier;
  return relative(repoRoot, resolve(dirname(file), specifier)).replace(
    /\\/g,
    "/",
  );
}

function forbiddenImport(specifier, target) {
  if (forbiddenPackages.some((pattern) => pattern.test(specifier))) {
    return true;
  }
  return forbiddenRepoPaths.some((path) => target.startsWith(path));
}
