import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const encryptedPrefix = "enc:";
const localPrefix = "local:";

export type CredereCredentialCodec = {
  decrypt: (value: string) => string;
  encrypt: (value: string) => string;
  fingerprint: (value: string) => string;
  keyRef: string;
};

export function createCredereCredentialCodec(
  env: Record<string, string | undefined>,
): CredereCredentialCodec {
  const key = readKey(env);
  return {
    decrypt: (value) => decrypt(value, key),
    encrypt: (value) => encrypt(value, key),
    fingerprint: (value) => createHash("sha256").update(value).digest("hex"),
    keyRef: "credere:v1",
  };
}

function encrypt(value: string, key: Buffer | null) {
  if (value.startsWith(encryptedPrefix) || value.startsWith(localPrefix)) {
    return value;
  }
  if (!key) return `${localPrefix}${Buffer.from(value).toString("base64url")}`;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    encryptedPrefix,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

function decrypt(value: string, key: Buffer | null) {
  if (value.startsWith(localPrefix)) {
    return Buffer.from(value.slice(localPrefix.length), "base64url").toString(
      "utf8",
    );
  }
  if (!value.startsWith(encryptedPrefix)) return value;
  if (!key) throw new Error("Credere credential encryption key missing.");
  const [, iv, tag, encrypted] = value.split(".");
  if (!iv || !tag || !encrypted) throw new Error("Credential payload invalid.");
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

function readKey(env: Record<string, string | undefined>) {
  const configured = env.CREDERE_CREDENTIAL_ENCRYPTION_KEY;
  if (!configured) {
    if (env.APP_ENV === "production" || env.NODE_ENV === "production") {
      throw new Error("CREDERE_CREDENTIAL_ENCRYPTION_KEY must be configured.");
    }
    return null;
  }
  return createHash("sha256").update(configured).digest();
}
