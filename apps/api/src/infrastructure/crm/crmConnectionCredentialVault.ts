import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import type {
  CrmConnectionCredentialVault,
  CrmCredentialScope,
} from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import { CrmConnectionSetupProviderError } from "../../domains/crm/ports/crmConnectionSetupProvider.js";

const PREFIX = "crm:v1";
const ALGORITHM = "aes-256-gcm";

export function createCrmConnectionCredentialVault(
  env: Record<string, string | undefined> = process.env,
): CrmConnectionCredentialVault {
  const key = readKey(env);

  return {
    async open(input) {
      return decrypt(input.sealed, input, key);
    },
    async seal(input) {
      if (!input.plaintext) {
        throw new CrmConnectionSetupProviderError(
          "CRM connection credential cannot be empty",
          "configuration_error",
        );
      }
      const iv = randomBytes(12);
      const cipher = createCipheriv(ALGORITHM, key, iv);
      cipher.setAAD(scopeAad(input));
      const ciphertext = Buffer.concat([
        cipher.update(input.plaintext, "utf8"),
        cipher.final(),
      ]);
      return [
        PREFIX,
        iv.toString("base64url"),
        cipher.getAuthTag().toString("base64url"),
        ciphertext.toString("base64url"),
      ].join(".");
    },
  };
}

export function openSealedCrmConnectionCredential(
  input: CrmCredentialScope & { sealed: string },
  env: Record<string, string | undefined> = process.env,
) {
  return decrypt(input.sealed, input, readKey(env));
}

function decrypt(sealed: string, scope: CrmCredentialScope, key: Buffer) {
  const [prefix, iv, tag, ciphertext, extra] = sealed.split(".");
  if (prefix !== PREFIX || !iv || !tag || !ciphertext || extra) {
    throw invalidCredential();
  }

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, "base64url"),
    );
    decipher.setAAD(scopeAad(scope));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw invalidCredential();
  }
}

function scopeAad(scope: CrmCredentialScope) {
  return Buffer.from(
    JSON.stringify({
      purpose: scope.purpose,
      storeId: scope.storeId,
      tenantId: scope.tenantId,
      version: 1,
    }),
    "utf8",
  );
}

function invalidCredential() {
  return new CrmConnectionSetupProviderError(
    "CRM connection credential could not be decrypted",
    "configuration_error",
  );
}

function readKey(env: Record<string, string | undefined>) {
  const configuredKey = env.CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY?.trim();
  if (!configuredKey) {
    throw new CrmConnectionSetupProviderError(
      "CRM connection credential encryption is not configured",
      "configuration_error",
    );
  }
  return createHash("sha256").update(configuredKey).digest();
}
