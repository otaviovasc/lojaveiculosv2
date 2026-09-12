import type { FinancingTokenSet } from "../../domains/financing/ports/financingProviderGateway.js";

export function serializeCredereOAuthToken(token: FinancingTokenSet) {
  return JSON.stringify({
    ...token,
    expiresAt: token.expiresAt?.toISOString() ?? null,
  });
}

export function deserializeCredereOAuthToken(value: string): FinancingTokenSet {
  const token = JSON.parse(value) as Record<string, unknown>;
  if (typeof token.accessToken !== "string" || !token.accessToken.trim()) {
    throw new Error("Stored Credere OAuth token is invalid.");
  }
  return {
    accessToken: token.accessToken,
    expiresAt:
      typeof token.expiresAt === "string" ? new Date(token.expiresAt) : null,
    providerAccountId:
      typeof token.providerAccountId === "string"
        ? token.providerAccountId
        : null,
    refreshToken:
      typeof token.refreshToken === "string" ? token.refreshToken : null,
    scope: typeof token.scope === "string" ? token.scope : null,
    tokenType: typeof token.tokenType === "string" ? token.tokenType : null,
  };
}
