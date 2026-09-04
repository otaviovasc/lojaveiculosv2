import { externalApiBasePath } from "@lojaveiculosv2/shared";
import type { Context } from "hono";
import { readExternalApiKeyFromAuthorizationHeader } from "../../domains/externalApi/crypto/apiKeyCrypto.js";
import { HttpContextAuthenticationError } from "./httpContextErrors.js";

export const externalApiRequestFingerprintContextKey =
  "externalApiRequestFingerprint";

export function isExternalApiAudience(path: string) {
  return (
    path === externalApiBasePath || path.startsWith(`${externalApiBasePath}/`)
  );
}

export function assertExternalApiAudience(path: string) {
  if (isExternalApiAudience(path)) return;
  throw new HttpContextAuthenticationError(
    "External API keys are only accepted by Public API routes.",
  );
}

export function readExternalApiKey(context: Context): string | null {
  return (
    context.req.header("x-api-key") ??
    readExternalApiKeyFromAuthorizationHeader(
      context.req.header("authorization"),
    )
  );
}

export function readExternalApiRequestFingerprint(context: Context) {
  const requestFingerprint = context.get(
    externalApiRequestFingerprintContextKey,
  ) as string | undefined;
  return requestFingerprint ? { requestFingerprint } : {};
}
