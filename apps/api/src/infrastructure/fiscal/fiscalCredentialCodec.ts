import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const prefix = "fiscal:v1";

export type FiscalCredentialCodec = {
  decrypt: (ciphertext: string) => string;
  encrypt: (plaintext: string) => string;
};

export function createFiscalCredentialCodec(
  env: Record<string, string | undefined>,
): FiscalCredentialCodec {
  return {
    decrypt: (ciphertext) =>
      decrypt(
        ciphertext,
        readEncryptionKey(env.FISCAL_CREDENTIAL_ENCRYPTION_KEY),
      ),
    encrypt: (plaintext) =>
      encrypt(
        plaintext,
        readEncryptionKey(env.FISCAL_CREDENTIAL_ENCRYPTION_KEY),
      ),
  };
}

export function verifyOpaqueWebhookToken(
  webhookUrl: string | undefined,
  receivedToken: string,
) {
  if (!webhookUrl || !receivedToken) return false;
  let expectedToken: string;
  try {
    expectedToken =
      new URL(webhookUrl).pathname.split("/").filter(Boolean).at(-1) ?? "";
  } catch {
    return false;
  }
  const expected = Buffer.from(expectedToken);
  const received = Buffer.from(receivedToken);
  return (
    expected.length === received.length &&
    expected.length >= 32 &&
    timingSafeEqual(expected, received)
  );
}

function encrypt(plaintext: string, key: Buffer) {
  if (!plaintext.trim()) throw new Error("Fiscal credential cannot be empty.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    prefix,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

function decrypt(ciphertext: string, key: Buffer) {
  const [namespace, iv, tag, encrypted] = ciphertext.split(".");
  if (
    namespace !== prefix ||
    iv === undefined ||
    tag === undefined ||
    encrypted === undefined
  ) {
    throw new Error("Fiscal credential payload is invalid.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function readEncryptionKey(configured: string | undefined) {
  if (!configured) {
    throw new Error("FISCAL_CREDENTIAL_ENCRYPTION_KEY must be configured.");
  }
  const key = /^[0-9a-f]{64}$/i.test(configured)
    ? Buffer.from(configured, "hex")
    : Buffer.from(configured, "base64");
  if (key.length !== 32) {
    throw new Error(
      "FISCAL_CREDENTIAL_ENCRYPTION_KEY must encode exactly 32 bytes.",
    );
  }
  return key;
}
