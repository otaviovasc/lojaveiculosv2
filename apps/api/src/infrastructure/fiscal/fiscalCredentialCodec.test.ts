import { describe, expect, it } from "vitest";
import {
  createFiscalCredentialCodec,
  FiscalCredentialDecryptionError,
  verifyOpaqueWebhookToken,
} from "./fiscalCredentialCodec.js";

const encryptionKey = Buffer.alloc(32, 7).toString("base64");

describe("fiscalCredentialCodec", () => {
  it("round-trips a company API key without storing plaintext", () => {
    const codec = createFiscalCredentialCodec({
      FISCAL_CREDENTIAL_ENCRYPTION_KEY: encryptionKey,
    });
    const ciphertext = codec.encrypt("company-secret");

    expect(ciphertext).not.toContain("company-secret");
    expect(codec.decrypt(ciphertext)).toBe("company-secret");
  });

  it("rejects encryption keys that are not 32 bytes", () => {
    expect(() => {
      const codec = createFiscalCredentialCodec({
        FISCAL_CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(16).toString("base64"),
      });
      codec.encrypt("company-secret");
    }).toThrow(/32 bytes/);
  });

  it("wraps ciphertext authentication failures in a safe typed error", () => {
    const writer = createFiscalCredentialCodec({
      FISCAL_CREDENTIAL_ENCRYPTION_KEY: encryptionKey,
    });
    const reader = createFiscalCredentialCodec({
      FISCAL_CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 8).toString("base64"),
    });

    expect(() => reader.decrypt(writer.encrypt("company-secret"))).toThrow(
      FiscalCredentialDecryptionError,
    );
    expect(() => reader.decrypt(writer.encrypt("company-secret"))).toThrow(
      "Stored fiscal credential cannot be decrypted.",
    );
  });

  it("compares the opaque webhook URL token", () => {
    const token = "a".repeat(64);
    expect(
      verifyOpaqueWebhookToken(
        `https://api.example.test/api/v1/fiscal/webhooks/spedy/${token}`,
        token,
      ),
    ).toBe(true);
    expect(
      verifyOpaqueWebhookToken(
        `https://api.example.test/api/v1/fiscal/webhooks/spedy/${token}`,
        "b".repeat(64),
      ),
    ).toBe(false);
  });
});
