import type {
  FinancingGatewayAuthConfig,
  FinancingTokenSet,
} from "../../domains/financing/ports/financingProviderGateway.js";
import { FinancingProviderGatewayError } from "../../domains/financing/ports/financingProviderGateway.js";
import {
  bearerHeaders,
  credereApiUrl,
  parseSafeJson,
  providerError,
  readNumber,
  readRecord,
  readString,
} from "./credereHttpSupport.js";

export const CREDERE_DEFAULT_SCOPE = "simulator+proposals";

export function createCredereAuthorizationUrl(
  auth: FinancingGatewayAuthConfig,
  input: { redirectUri: string; state?: string },
) {
  const url = new URL(credereApiUrl("/authorize"));
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("client_id", auth.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", auth.scope ?? CREDERE_DEFAULT_SCOPE);
  if (input.state) url.searchParams.set("state", input.state);
  return url.toString();
}

export async function exchangeCredereAuthorizationCode(
  fetchImpl: typeof fetch,
  auth: FinancingGatewayAuthConfig,
  input: { code: string; redirectUri: string },
) {
  return tokenRequest(fetchImpl, {
    client_id: auth.clientId,
    client_secret: auth.clientSecret,
    code: input.code,
    grant_type: "authorization_code",
    redirect_uri: input.redirectUri,
    scope: auth.scope ?? CREDERE_DEFAULT_SCOPE,
  });
}

export async function refreshCredereToken(
  fetchImpl: typeof fetch,
  auth: FinancingGatewayAuthConfig,
  refreshToken: string,
) {
  return tokenRequest(fetchImpl, {
    client_id: auth.clientId,
    client_secret: auth.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

export async function revokeCredereToken(
  fetchImpl: typeof fetch,
  accessToken: string,
) {
  const response = await fetchImpl(credereApiUrl("/revoke"), {
    headers: bearerHeaders(accessToken),
    method: "POST",
  });
  if (!response.ok) throw providerError(response);
}

async function tokenRequest(
  fetchImpl: typeof fetch,
  body: Record<string, string>,
): Promise<FinancingTokenSet> {
  const response = await fetchImpl(credereApiUrl("/token"), {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = await parseSafeJson(response);
  if (!response.ok) throw providerError(response);

  const accessToken = readString(payload.access_token);
  if (!accessToken) {
    throw new FinancingProviderGatewayError(
      "invalid_response",
      "Credere token response is missing access_token.",
      502,
    );
  }
  return {
    accessToken,
    expiresAt: expiresAt(payload),
    providerAccountId: readString(readRecord(payload.user).id),
    refreshToken: readString(payload.refresh_token),
    scope: readString(payload.scope),
    tokenType: readString(payload.token_type),
  };
}

function expiresAt(payload: Record<string, unknown>) {
  const expiresIn = readNumber(payload.expires_in);
  if (expiresIn === null) return null;
  return new Date(Date.now() + expiresIn * 1000);
}
