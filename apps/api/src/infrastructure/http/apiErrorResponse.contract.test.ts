import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const apiSrcRoot = fileURLToPath(new URL("../../", import.meta.url));
const scanRoots = [
  fileURLToPath(new URL("../../features/", import.meta.url)),
  fileURLToPath(new URL("./", import.meta.url)),
];
const allowedFileSuffixes = ["infrastructure/http/apiErrorResponse.ts"];

describe("API error response contract", () => {
  it("keeps feature controllers on the shared JSON error envelope", () => {
    const violations = scanRoots.flatMap((root) =>
      [...walk(root)].flatMap((file) => violationsFor(file)),
    );

    expect(violations).toEqual([]);
  });
});

function violationsFor(file: string) {
  const path = relative(apiSrcRoot, file);
  if (!path.endsWith(".ts")) return [];
  if (path.includes(".test.") || path.includes(".testSupport")) return [];
  if (allowedFileSuffixes.some((suffix) => path.endsWith(suffix))) return [];

  const source = readFileSync(file, "utf8");
  const violations = [];
  if (/\.json\s*\(\s*\{\s*message\s*:/s.test(source)) {
    violations.push(`${path}: direct { message } JSON error response`);
  }
  if (/\bcontext\.error\s*=/.test(source)) {
    violations.push(`${path}: direct context.error assignment`);
  }
  return violations;
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = `${dir}/${entry}`;
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}
