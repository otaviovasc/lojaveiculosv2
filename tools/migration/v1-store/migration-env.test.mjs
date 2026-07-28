import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadMigrationEnv } from "./migration-env.mjs";

test("loads migration provider variables without replacing exported values", () => {
  const directory = mkdtempSync(join(tmpdir(), "v1-migration-env-"));
  const env = {
    DATABASE_URL: "postgresql://explicit-staging",
    SPEDY_API_URL: "https://exported.example",
  };
  try {
    writeFileSync(
      join(directory, ".env"),
      [
        "DATABASE_URL=postgresql://must-not-load",
        "FISCAL_CREDENTIAL_ENCRYPTION_KEY=fiscal-key",
        "SPEDY_API_URL=https://file.example",
        "SPEDY_OWNER_API_KEY=owner-key",
        "SPEDY_WEBHOOK_URL=https://webhook.example",
      ].join("\n"),
    );

    loadMigrationEnv(directory, env);

    assert.equal(env.DATABASE_URL, "postgresql://explicit-staging");
    assert.equal(env.SPEDY_API_URL, "https://exported.example");
    assert.equal(env.SPEDY_OWNER_API_KEY, "owner-key");
    assert.equal(env.SPEDY_WEBHOOK_URL, "https://webhook.example");
    assert.equal(env.FISCAL_CREDENTIAL_ENCRYPTION_KEY, "fiscal-key");
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
