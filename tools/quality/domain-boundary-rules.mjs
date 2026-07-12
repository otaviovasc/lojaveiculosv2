import { dirname, relative, resolve } from "node:path";
import { collectModuleSpecifiers } from "./typescript-source.mjs";

const forbiddenPackages = [
  /^@aws-sdk(?:\/|$)/,
  /^hono(?:\/|$)/,
  /^@hono(?:\/|$)/,
  /^drizzle-orm(?:\/|$)/,
  /^pino(?:-pretty)?(?:\/|$)/,
  /^@clerk(?:\/|$)/,
  /^@lojaveiculosv2\/(?:audit-db|db)(?:\/|$)/,
  /^@scalar(?:\/|$)/,
  /^@sentry\/node(?:\/|$)/,
  /^express(?:\/|$)/,
  /^next(?:\/|$)/,
  /^postgres(?:\/|$)/,
  /^redis(?:\/|$)/,
];
const forbiddenRepoPaths = [
  "apps/api/src/features",
  "apps/api/src/infrastructure",
];

export function findDomainBoundaryViolations(file, source, repoRoot) {
  return collectModuleSpecifiers(file, source).flatMap(
    ({ line, specifier }) => {
      const target = normalizeImportTarget(file, specifier, repoRoot);
      if (!forbiddenImport(specifier, target)) return [];
      return [{ line, specifier, target }];
    },
  );
}

function normalizeImportTarget(file, specifier, repoRoot) {
  if (!specifier.startsWith(".")) return specifier;
  return relative(repoRoot, resolve(dirname(file), specifier)).replace(
    /\\/g,
    "/",
  );
}

function forbiddenImport(specifier, target) {
  if (forbiddenPackages.some((pattern) => pattern.test(specifier))) return true;
  return forbiddenRepoPaths.some(
    (path) => target === path || target.startsWith(`${path}/`),
  );
}
