import { describe, expect, it } from "vitest";
import { createMarketplaceCredentialCodec } from "./marketplaceCredentialCodec.js";

describe("createMarketplaceCredentialCodec", () => {
  it("encrypts and redacts provider tokens", () => {
    const codec = createMarketplaceCredentialCodec({
      APP_ENV: "production",
      MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY: "test-key",
      NODE_ENV: "production",
    });

    const encoded = codec.encodeAccountConfig({
      credentials: {
        accessToken: "access_secret",
        refreshToken: "refresh_secret",
      },
    });

    expect(encoded.credentials).not.toEqual({
      accessToken: "access_secret",
      refreshToken: "refresh_secret",
    });
    expect(codec.decodeAccountConfig(encoded).credentials).toEqual({
      accessToken: "access_secret",
      refreshToken: "refresh_secret",
    });
    expect(codec.redactAccountConfig(encoded).credentials).toEqual({
      accessToken: "[redacted]",
      refreshToken: "[redacted]",
    });
  });

  it("rejects local and plaintext credential rows in production", () => {
    const codec = createMarketplaceCredentialCodec({
      APP_ENV: "production",
      MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY: "test-key",
    });

    expect(() => codec.decryptSecret("local:c2VjcmV0")).toThrow(
      /invalid in production/i,
    );
    expect(() => codec.decryptSecret("plaintext-secret")).toThrow(
      /invalid in production/i,
    );
  });

  it("re-encrypts a local credential when encoding for production", () => {
    const codec = createMarketplaceCredentialCodec({
      APP_ENV: "production",
      MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY: "test-key",
    });

    const encrypted = codec.encryptSecret("local:c2VjcmV0");

    expect(encrypted).toMatch(/^enc:/);
    expect(codec.decryptSecret(encrypted)).toBe("secret");
  });
});
