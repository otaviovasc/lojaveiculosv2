import { execFileSync } from "node:child_process";
import { findTrackedDependencyArtifacts } from "./repository-artifact-rules.mjs";

const trackedPaths = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
const failures = findTrackedDependencyArtifacts(trackedPaths);

if (failures.length > 0) {
  console.error("Tracked dependency artifacts are not allowed:");
  for (const path of failures) console.error(`- ${path}`);
  process.exit(1);
}

console.log("Repository artifact guardrails passed.");
