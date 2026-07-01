import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const scanRoots = ["apps/api/src/features", "apps/api/src/infrastructure/http"];
const allowedFiles = new Set([
  "apps/api/src/infrastructure/http/apiErrorResponse.ts",
]);
const failures = [];

for (const scanRoot of scanRoots) {
  for (const file of walk(join(root, scanRoot))) {
    const repoPath = relative(root, file);
    if (!repoPath.endsWith(".ts")) continue;
    if (repoPath.includes(".test.") || repoPath.includes(".testSupport"))
      continue;
    if (allowedFiles.has(repoPath)) continue;

    const source = readFileSync(file, "utf8");
    if (/\.json\s*\(\s*\{\s*message\s*:/s.test(source)) {
      failures.push(
        `${repoPath}: use jsonApiError(...) instead of direct { message } JSON errors`,
      );
    }
    if (/\bcontext\.error\s*=/.test(source)) {
      failures.push(
        `${repoPath}: set context.error through jsonApiError(...) metadata handling`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("API error envelope guardrail violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      yield* walk(path);
    } else {
      yield path;
    }
  }
}
