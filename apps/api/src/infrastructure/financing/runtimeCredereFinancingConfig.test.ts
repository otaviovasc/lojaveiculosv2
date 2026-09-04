import { describe, expect, it } from "vitest";
import { resolveRuntimeCredereFinancingConfig } from "./runtimeCredereFinancingConfig.js";

describe("runtime Credere financing config", () => {
  it("uses official defaults and no bank allowlist when unset", () => {
    const config = resolveRuntimeCredereFinancingConfig({
      APP_ENV: "staging",
      CREDERE_ENVIRONMENT: "production",
      CREDERE_CLIENT_ID: "client_id",
      CREDERE_CLIENT_SECRET: "client_secret",
      CREDERE_CREDENTIAL_ENCRYPTION_KEY: "key",
      CREDERE_REDIRECT_URI: "https://api.example.com/callback",
    });

    expect(config).toMatchObject({
      apiRoot: "https://app.meucredere.com.br/api/v1",
      bankPolicyCodes: null,
      environment: "production",
      scope: "simulator proposals",
    });
  });

  it("uses explicit bank allowlist only when configured", () => {
    const config = resolveRuntimeCredereFinancingConfig({
      APP_ENV: "staging",
      CREDERE_ENVIRONMENT: "production",
      CREDERE_BANK_POLICY_CODES: "655,623,invalid,655",
      CREDERE_CLIENT_ID: "client_id",
      CREDERE_CLIENT_SECRET: "client_secret",
      CREDERE_CREDENTIAL_ENCRYPTION_KEY: "key",
      CREDERE_REDIRECT_URI: "https://api.example.com/callback",
    });

    expect(config?.bankPolicyCodes).toEqual(["655", "623"]);
  });

  it("disables Credere without crashing staging when credentials are incomplete", () => {
    expect(
      resolveRuntimeCredereFinancingConfig({
        APP_ENV: "staging",
        CREDERE_CLIENT_ID: "client_id",
      }),
    ).toBeNull();
  });

  it("disables Credere instead of silently selecting production", () => {
    expect(
      resolveRuntimeCredereFinancingConfig({
        APP_ENV: "staging",
        CREDERE_CLIENT_ID: "client_id",
        CREDERE_CLIENT_SECRET: "client_secret",
        CREDERE_CREDENTIAL_ENCRYPTION_KEY: "key",
        CREDERE_REDIRECT_URI: "https://api.example.com/callback",
      }),
    ).toBeNull();
  });

  it("requires and preserves an explicit HTTPS sandbox API root", () => {
    expect(
      resolveRuntimeCredereFinancingConfig({
        APP_ENV: "staging",
        CREDERE_API_ROOT: "https://sandbox.credere.example/api/v1/",
        CREDERE_CLIENT_ID: "client_id",
        CREDERE_CLIENT_SECRET: "client_secret",
        CREDERE_CREDENTIAL_ENCRYPTION_KEY: "key",
        CREDERE_ENVIRONMENT: "sandbox",
        CREDERE_REDIRECT_URI: "https://api.example.com/callback",
      }),
    ).toMatchObject({
      apiRoot: "https://sandbox.credere.example/api/v1",
      environment: "sandbox",
    });
  });

  it("keeps the deployed API available when Credere is entirely unconfigured", () => {
    expect(
      resolveRuntimeCredereFinancingConfig({
        APP_ENV: "staging",
      }),
    ).toBeNull();
  });

  it("disables Credere when only the bank policy is configured", () => {
    expect(
      resolveRuntimeCredereFinancingConfig({
        APP_ENV: "staging",
        CREDERE_BANK_POLICY_CODES: "655,623",
      }),
    ).toBeNull();
  });

  it("disables Credere for an invalid sandbox API root", () => {
    expect(
      resolveRuntimeCredereFinancingConfig({
        APP_ENV: "staging",
        CREDERE_API_ROOT: "http://sandbox.credere.example/api/v1",
        CREDERE_CLIENT_ID: "client_id",
        CREDERE_CLIENT_SECRET: "client_secret",
        CREDERE_CREDENTIAL_ENCRYPTION_KEY: "key",
        CREDERE_ENVIRONMENT: "sandbox",
        CREDERE_REDIRECT_URI: "https://api.example.com/callback",
      }),
    ).toBeNull();
  });

  it("allows local/test runtime to omit Credere credentials", () => {
    expect(
      resolveRuntimeCredereFinancingConfig({
        APP_ENV: "local",
      }),
    ).toBeNull();
  });
});
