#!/usr/bin/env node
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const testDirectory = join(repositoryRoot, "tools", "migration", "v1-store");
const testFiles = readdirSync(testDirectory)
  .filter((name) => name.endsWith(".test.mjs"))
  .sort()
  .map((name) => join(testDirectory, name));
const loader = resolve(
  repositoryRoot,
  "apps/api/node_modules/tsx/dist/loader.mjs",
);
const result = spawnSync(
  process.execPath,
  ["--import", loader, "--test", ...testFiles],
  {
    cwd: repositoryRoot,
    env: { ...process.env, NO_COLOR: "1" },
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
