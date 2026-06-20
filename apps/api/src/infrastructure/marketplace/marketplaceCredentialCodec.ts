import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const localPrefix = "local:";
const encryptedPrefix = "enc:";

export type MarketplaceCredentialCodec = {
  decodeAccountConfig: (
    config: Record<string, unknown>,
  ) => Record<string, unknown>;
  encodeAccountConfig: (
    config: Record<string, unknown>,
  ) => Record<string, unknown>;
  redactAccountConfig: (
    config: Record<string, unknown>,
  ) => Record<string, unknown>;
};

export function createMarketplaceCredentialCodec(
  env: Record<string, string | undefined>,
): MarketplaceCredentialCodec {
  return {
    decodeAccountConfig: (config) =>
      mapCredentials(config, (value) => decrypt(value, env)),
    encodeAccountConfig: (config) =>
      mapCredentials(config, (value) => encrypt(value, env)),
    redactAccountConfig: redactAccountConfig,
  };
}

function mapCredentials(
  config: Record<string, unknown>,
  mapper: (value: string) => string,
) {
  const credentials = toRecord(config.credentials);
  if (!Object.keys(credentials).length) return config;
  return {
    ...config,
    credentials: Object.fromEntries(
      Object.entries(credentials).map(([key, value]) => [
        key,
        typeof value === "string" && value ? mapper(value) : value,
      ]),
    ),
  };
}

function redactAccountConfig(config: Record<string, unknown>) {
  const credentials = toRecord(config.credentials);
  if (!Object.keys(credentials).length) return config;
  return {
    ...config,
    credentials: Object.fromEntries(
      Object.keys(credentials).map((key) => [key, "[redacted]"]),
    ),
  };
}

function encrypt(value: string, env: Record<string, string | undefined>) {
  if (value.startsWith(encryptedPrefix) || value.startsWith(localPrefix)) {
    return value;
  }
  const key = readEncryptionKey(env);
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

function decrypt(value: string, env: Record<string, string | undefined>) {
  if (value.startsWith(localPrefix)) {
    return Buffer.from(value.slice(localPrefix.length), "base64url").toString(
      "utf8",
    );
  }
  if (!value.startsWith(encryptedPrefix)) return value;
  const key = readEncryptionKey(env);
  if (!key) throw new Error("Marketplace credential encryption key missing.");
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

function readEncryptionKey(env: Record<string, string | undefined>) {
  const configured = env.MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY;
  if (!configured) {
    if (env.APP_ENV === "production" || env.NODE_ENV === "production") {
      throw new Error(
        "MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY must be configured.",
      );
    }
    return null;
  }
  return createHash("sha256").update(configured).digest();
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
