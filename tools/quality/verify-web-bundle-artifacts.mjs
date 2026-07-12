import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import webBundlePolicy from "./web-bundle-policy.json" with { type: "json" };
import {
  findWebBundleArtifactViolations,
  summarizeMeasuredBundle,
} from "./web-bundle-artifact-rules.mjs";

const root = new URL("../../", import.meta.url).pathname;
const outputDirectory = join(root, webBundlePolicy.outputDirectory);
const manifestPath = join(
  outputDirectory,
  webBundlePolicy.manifestRelativePath,
);
const files = collectArtifacts(outputDirectory);
const { manifest, manifestError } = readManifest(manifestPath);
const failures = findWebBundleArtifactViolations({
  files,
  manifest,
  manifestError,
  policy: webBundlePolicy,
});

if (failures.length > 0) {
  console.error("Web bundle artifact violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const summary = summarizeMeasuredBundle(files, webBundlePolicy);
console.log("Web bundle budgets verified from fresh production artifacts:");
for (const [kind, file] of Object.entries(summary)) {
  if (file) console.log(`- ${kind}: ${file.path} (${file.sizeBytes} bytes)`);
}

function collectArtifacts(directory) {
  try {
    return walk(directory);
  } catch (error) {
    console.error(
      `Cannot inspect ${webBundlePolicy.outputDirectory}: ${error.message}`,
    );
    process.exit(1);
  }

  function walk(current) {
    return readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
      const absolute = join(current, entry.name);
      if (entry.isDirectory()) return walk(absolute);
      const path = relative(directory, absolute).split(sep).join("/");
      if (entry.isFile()) {
        return [{ path, sizeBytes: statSync(absolute).size, type: "file" }];
      }
      return [{ path, sizeBytes: 0, type: "non-file entry" }];
    });
  }
}

function readManifest(file) {
  try {
    return { manifest: JSON.parse(readFileSync(file, "utf8")) };
  } catch (error) {
    return { manifest: null, manifestError: error.message };
  }
}
