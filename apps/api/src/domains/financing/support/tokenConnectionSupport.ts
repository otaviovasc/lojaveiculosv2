import type { TenantId } from "@lojaveiculosv2/shared";
import type {
  FinancingConnection,
  FinancingProvider,
} from "../ports/financingRepository.js";
import {
  assertActiveConnection,
  FinancingValidationError,
  getFinancingGateway,
  now,
  type FinancingServicePorts,
} from "../services/FinancingService/serviceSupport.js";

export async function getUsableProviderConnection(
  input: { provider: FinancingProvider; tenantId: TenantId },
  ports: FinancingServicePorts,
): Promise<FinancingConnection> {
  const connection = assertActiveConnection(
    await ports.repository.findConnection(input),
    input.provider,
  );
  const currentToken = connection.token;
  if (!currentToken) {
    throw new FinancingValidationError("Financing token is missing.");
  }
  const expiresAt = currentToken.expiresAt;
  if (!expiresAt || expiresAt.getTime() > now(ports).getTime() + 60_000) {
    return connection;
  }
  if (!currentToken.refreshToken) {
    throw new FinancingValidationError("Financing refresh token is missing.");
  }
  const previousRefreshToken = currentToken.refreshToken;
  const token =
    await getFinancingGateway(ports).refreshToken(previousRefreshToken);
  const rotated = await ports.repository.rotateConnectionToken({
    connectionId: connection.id,
    previousRefreshToken,
    provider: input.provider,
    providerAccountId: token.providerAccountId,
    status: "connected",
    tenantId: input.tenantId,
    token,
  });
  if (rotated) return rotated;
  const winner = assertActiveConnection(
    await ports.repository.findConnection(input),
    input.provider,
  );
  if (
    winner.token?.accessToken &&
    (!winner.token.expiresAt ||
      winner.token.expiresAt.getTime() > now(ports).getTime() + 60_000)
  ) {
    return winner;
  }
  throw new FinancingValidationError(
    "Financing token refresh conflicted with another request.",
  );
}
