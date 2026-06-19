import { createHash, randomBytes } from "node:crypto";

export type GeneratedExternalApiKey = {
  keyHash: string;
  keyPrefix: string;
  plaintextKey: string;
};

export function generateExternalApiKey(): GeneratedExternalApiKey {
  const keyPrefix = `lv2_${randomBytes(4).toString("hex")}`;
  const secret = randomBytes(32).toString("base64url");
  const plaintextKey = `${keyPrefix}_${secret}`;

  return {
    keyHash: hashExternalApiKey(plaintextKey),
    keyPrefix,
    plaintextKey,
  };
}

export function hashExternalApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export function readExternalApiKeyFromAuthorizationHeader(
  authorizationHeader: string | undefined,
): string | null {
  if (!authorizationHeader) return null;
  const [scheme, credential] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !credential) return null;
  if (!credential.startsWith("lv2_")) return null;
  return credential;
}
