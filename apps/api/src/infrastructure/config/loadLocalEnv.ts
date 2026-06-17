import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export function loadLocalEnv(startDirectory = process.cwd()): void {
  for (const envPath of findEnvCandidates(startDirectory)) {
    if (existsSync(envPath)) {
      loadEnvFile(envPath);
      return;
    }
  }
}

function findEnvCandidates(startDirectory: string): string[] {
  const candidates: string[] = [];
  let current = startDirectory;

  for (let depth = 0; depth < 5; depth += 1) {
    candidates.push(join(current, ".env"));
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return candidates;
}

function loadEnvFile(path: string): void {
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const parsed = parseEnvLine(line);
    if (!parsed || process.env[parsed.key] !== undefined) continue;
    process.env[parsed.key] = parsed.value;
  }
}

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const separator = trimmed.indexOf("=");
  if (separator === -1) return null;

  const key = trimmed.slice(0, separator).trim();
  const value = trimmed
    .slice(separator + 1)
    .trim()
    .replace(/^["']|["']$/g, "");

  return key ? { key, value } : null;
}
