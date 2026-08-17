import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readlinkSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const CACHE_VERSION = 1;
const DEFAULT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const MAX_ENTRIES = 8;

export function createValidationFingerprint({ scope }) {
  const hash = createHash("sha256");
  hash.update(`validation-cache-v${CACHE_VERSION}\0`);
  hash.update(`${process.platform}\0${process.arch}\0${process.version}\0`);
  hash.update(`${scope}\0${process.env.CI ?? ""}\0`);
  hash.update(`${process.env.VALIDATION_CACHE_BUST ?? ""}\0`);
  hash.update(gitText(["write-tree"]));
  hash.update("\0worktree-diff\0");
  hash.update(gitBuffer(["diff", "--binary", "--no-ext-diff"]));

  const untracked = gitBuffer([
    "ls-files",
    "--others",
    "--exclude-standard",
    "-z",
  ])
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort();
  for (const path of untracked) {
    hash.update("\0untracked\0");
    hash.update(path);
    hash.update("\0");
    const stat = lstatSync(path);
    hash.update(
      stat.isSymbolicLink() ? readlinkSync(path) : readFileSync(path),
    );
  }
  return hash.digest("hex");
}

export function hasFreshValidationStep(
  fingerprint,
  step,
  { maxAgeMs = DEFAULT_MAX_AGE_MS, now = Date.now() } = {},
) {
  if (!cacheEnabled()) return false;
  const entry = readCache().entries[fingerprint];
  return Boolean(
    entry &&
    now - entry.updatedAt <= maxAgeMs &&
    entry.completedSteps.includes(step),
  );
}

export function recordValidationStep(
  fingerprint,
  step,
  { now = Date.now() } = {},
) {
  if (!cacheEnabled()) return;
  const cache = readCache();
  const previous = cache.entries[fingerprint];
  cache.entries[fingerprint] = {
    completedSteps: [...new Set([...(previous?.completedSteps ?? []), step])],
    updatedAt: now,
  };
  cache.entries = Object.fromEntries(
    Object.entries(cache.entries)
      .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
      .slice(0, MAX_ENTRIES),
  );
  writeCache(cache);
}

function cacheEnabled() {
  return process.env.VALIDATION_CACHE !== "off";
}

function readCache() {
  const path = cachePath();
  if (!existsSync(path)) return emptyCache();
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (parsed.version !== CACHE_VERSION || !parsed.entries)
      return emptyCache();
    return parsed;
  } catch {
    return emptyCache();
  }
}

function writeCache(cache) {
  const path = cachePath();
  const temporaryPath = `${path}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(cache)}\n`, { mode: 0o600 });
  renameSync(temporaryPath, path);
}

function emptyCache() {
  return { entries: {}, version: CACHE_VERSION };
}

function cachePath() {
  return resolve(gitText(["rev-parse", "--git-path", "validation-cache.json"]));
}

function gitText(args) {
  return gitBuffer(args).toString("utf8").trim();
}

function gitBuffer(args) {
  return execFileSync("git", args, { maxBuffer: 64 * 1024 * 1024 });
}
