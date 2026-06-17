import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../../apps/api/src/domains", import.meta.url).pathname;
const forbidden = [
  "hono",
  "drizzle-orm",
  "pino",
  "@clerk",
  "express",
  "next/",
  "/infrastructure/",
  "/features/",
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      walk(path, files);
    } else if (path.endsWith(".ts") || path.endsWith(".tsx")) {
      files.push(path);
    }
  }

  return files;
}

const offenders = walk(root).flatMap((file) => {
  const source = readFileSync(file, "utf8");
  return forbidden
    .filter(
      (token) => source.includes(`from "${token}`) || source.includes(token),
    )
    .map((token) => ({ file, token }));
});

if (offenders.length > 0) {
  console.error("Domain boundary violations:");
  for (const offender of offenders) {
    console.error(`${offender.file}: ${offender.token}`);
  }
  process.exit(1);
}
