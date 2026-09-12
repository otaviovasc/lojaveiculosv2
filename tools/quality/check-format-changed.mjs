#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";

const files = changedFiles().filter(
  (file) => existsSync(file) && statSync(file).isFile(),
);

if (files.length === 0) {
  console.log("Changed-file format guard skipped: no changed files.");
  process.exit(0);
}

console.log(`Checking formatting for ${files.length} changed file(s)...`);
const result = spawnSync(
  "pnpm",
  ["exec", "prettier", "--check", "--ignore-unknown", "--", ...files],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);

function changedFiles() {
  const files = new Set();
  const base = ["origin/staging", "origin/main"]
    .map((ref) => tryGit(["merge-base", ref, "HEAD"]))
    .find(Boolean);
  if (base)
    addLines(
      files,
      git(["diff", "--name-only", "--diff-filter=ACMR", `${base}..HEAD`]),
    );
  addLines(
    files,
    git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]),
  );
  addLines(files, git(["diff", "--name-only", "--diff-filter=ACMR"]));
  addLines(files, git(["ls-files", "--others", "--exclude-standard"]));
  return [...files].sort();
}

function addLines(target, output) {
  for (const line of output.split("\n")) {
    if (line) target.add(line);
  }
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function tryGit(args) {
  try {
    return git(args);
  } catch {
    return null;
  }
}
