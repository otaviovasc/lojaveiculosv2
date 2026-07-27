import { describe, expect, it } from "vitest";
import { RuntimeDatabaseConfigError } from "../db/runtimeConfig.js";
import { resolveRuntimeCredereFinancingConfig } from "./runtimeCredereFinancingConfig.js";

describe("runtime Credere financing config", () => {
  it("uses official defaults and no bank allowlist when unset", () => {
    const config = resolveRuntimeCredereFinancingConfig({
      APP_ENV: "staging",
      CREDERE_CLIENT_ID: "client_id",
      CREDERE_CLIENT_SECRET: "client_secret",
      CREDERE_CREDENTIAL_ENCRYPTION_KEY: "key",
      CREDERE_REDIRECT_URI: "https://api.example.com/callback",
    });

    expect(config).toMatchObject({
      bankPolicyCodes: null,
      scope: "simulator+proposals",
    });
  });

  it("uses explicit bank allowlist only when configured", () => {
    const config = resolveRuntimeCredereFinancingConfig({
      APP_ENV: "staging",
      CREDERE_BANK_POLICY_CODES: "655,623,invalid,655",
      CREDERE_CLIENT_ID: "client_id",
      CREDERE_CLIENT_SECRET: "client_secret",
      CREDERE_CREDENTIAL_ENCRYPTION_KEY: "key",
      CREDERE_REDIRECT_URI: "https://api.example.com/callback",
    });

    expect(config?.bankPolicyCodes).toEqual(["655", "623"]);
  });

  it("fails closed outside local and test when credentials are incomplete", () => {
    expect(() =>
      resolveRuntimeCredereFinancingConfig({
        APP_ENV: "staging",
        CREDERE_CLIENT_ID: "client_id",
      }),
    ).toThrow(RuntimeDatabaseConfigError);
  });

  it("keeps the deployed API available when Credere is entirely unconfigured", () => {
    expect(
      resolveRuntimeCredereFinancingConfig({
        APP_ENV: "staging",
      }),
    ).toBeNull();
  });

  it("fails closed when only the bank policy is configured", () => {
    expect(() =>
      resolveRuntimeCredereFinancingConfig({
        APP_ENV: "staging",
        CREDERE_BANK_POLICY_CODES: "655,623",
      }),
    ).toThrow(RuntimeDatabaseConfigError);
  });

  it("allows local/test runtime to omit Credere credentials", () => {
    expect(
      resolveRuntimeCredereFinancingConfig({
        APP_ENV: "local",
      }),
    ).toBeNull();
  });
});
