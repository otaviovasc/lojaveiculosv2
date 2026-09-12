import { createCipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "crm:v1";

export function createCrmCredentialSealer(
  secret = process.env.CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY,
) {
  if (!secret?.trim()) {
    throw new Error(
      "CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY is required to import WhatsApp credentials.",
    );
  }
  const key = createHash("sha256").update(secret).digest();
  return ({ plaintext, purpose, storeId, tenantId }) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(
      Buffer.from(
        JSON.stringify({ purpose, storeId, tenantId, version: 1 }),
        "utf8",
      ),
    );
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    return [
      PREFIX,
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(".");
  };
}
