import { readFileSync } from "node:fs";
import { join } from "node:path";
import webBundlePolicy from "./web-bundle-policy.json" with { type: "json" };
import { findWebBundleConfigViolations } from "./web-bundle-config-rules.mjs";

const root = new URL("../../", import.meta.url).pathname;
const rootScripts = readJson("package.json").scripts ?? {};
const webScripts = readJson("apps/web/package.json").scripts ?? {};
const viteConfigSource = read("apps/web/vite.config.ts");
const failures = findWebBundleConfigViolations({
  policy: webBundlePolicy,
  rootScripts,
  viteConfigSource,
  webScripts,
});

if (failures.length > 0) {
  console.error("Web bundle policy violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

function read(file) {
  return readFileSync(join(root, file), "utf8");
}

function readJson(file) {
  return JSON.parse(read(file));
}
