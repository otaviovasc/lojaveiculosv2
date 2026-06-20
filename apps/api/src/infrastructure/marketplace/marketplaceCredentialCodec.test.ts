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
});
