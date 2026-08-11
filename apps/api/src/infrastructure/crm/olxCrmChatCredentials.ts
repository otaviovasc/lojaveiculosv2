import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import { OLX_ACCESS_TOKEN_CREDENTIAL_PURPOSE } from "../../domains/crm/ports/crmOlxCredentials.js";
import { CrmWhatsappGatewayError } from "../../domains/crm/ports/crmWhatsappGateway.js";
import { openSealedCrmConnectionCredential } from "./crmConnectionCredentialVault.js";

export function resolveOlxAccessToken(
  connection: CrmConnection,
  env: Record<string, string | undefined>,
) {
  const stored = readRecord(connection.credentialsRef.stored);
  const sealed = readString(stored.accessToken);
  if (sealed) {
    if (!sealed.startsWith("crm:v1.")) throw configurationError();
    try {
      return openSealedCrmConnectionCredential(
        {
          purpose: OLX_ACCESS_TOKEN_CREDENTIAL_PURPOSE,
          sealed,
          storeId: connection.storeId,
          tenantId: connection.tenantId,
        },
        env,
      );
    } catch {
      throw configurationError();
    }
  }
  throw configurationError();
}

function configurationError() {
  return new CrmWhatsappGatewayError(
    "OLX Chat access-token credential reference is not configured.",
    502,
    undefined,
    "configuration_error",
  );
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
