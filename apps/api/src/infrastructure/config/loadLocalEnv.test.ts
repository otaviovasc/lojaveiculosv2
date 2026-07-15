import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getAsaasProviderStatus } from "../billing/asaasPaymentProviderConfig.js";
import { loadLocalEnvBefore } from "./loadLocalEnv.js";

const asaasKeys = [
  "ASAAS_API_KEY",
  "ASAAS_API_URL",
  "ASAAS_RUNTIME_IMPLEMENTATION",
  "ASAAS_WEBHOOK_SECRET",
  "ASAAS_WEBHOOK_URL",
  "PUBLIC_APP_URL",
] as const;
const originalEnv = Object.fromEntries(
  asaasKeys.map((key) => [key, process.env[key]]),
);
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const key of asaasKeys) {
    const original = originalEnv[key];
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("loadLocalEnvBefore", () => {
  it("loads provider configuration before runtime modules capture process.env", async () => {
    const directory = mkdtempSync(join(tmpdir(), "lojaveiculos-env-"));
    temporaryDirectories.push(directory);
    writeFileSync(
      join(directory, ".env"),
      [
        "ASAAS_API_KEY=test-key",
        "ASAAS_API_URL=https://api-sandbox.asaas.com/v3",
        "ASAAS_RUNTIME_IMPLEMENTATION=http",
        "ASAAS_WEBHOOK_SECRET=test-secret-with-at-least-32-characters",
        "ASAAS_WEBHOOK_URL=https://example.test/api/v1/billing/webhooks/asaas",
        "PUBLIC_APP_URL=http://localhost:5173",
      ].join("\n"),
    );
    for (const key of asaasKeys) delete process.env[key];

    const capturedStatus = await loadLocalEnvBefore(
      async () => getAsaasProviderStatus(process.env),
      directory,
    );

    expect(capturedStatus).toMatchObject({
      configured: true,
      missingConfiguration: [],
      webhookConfigured: true,
    });
  });
});
