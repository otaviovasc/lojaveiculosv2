import { readFileSync } from "node:fs";

const env = readFileSync(
  new URL("../../.env.example", import.meta.url),
  "utf8",
);
const secretPattern = /(sk_live|sk_test|eyJ|postgres:\/\/[^$]|-----BEGIN)/i;

if (secretPattern.test(env)) {
  console.error(
    ".env.example appears to contain a real secret or concrete DB URL.",
  );
  process.exit(1);
}
