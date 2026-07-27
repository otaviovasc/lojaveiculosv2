import type { TenantId } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { createServiceLogMetadata } from "../../../../shared/serviceContext.js";
import type {
  CompleteFinancingOAuthInput,
  StartFinancingOAuthResult,
} from "./types.js";
import {
  addMinutes,
  createOpaqueState,
  createPkceVerifier,
  financingConnectionManagePermission,
  FinancingOAuthStateInvalidError,
  getFinancingGateway,
  now,
  requireAgencyFinancingScope,
  resolveOAuthRedirectUri,
  sha256Base64Url,
  sha256Hex,
  type FinancingServicePorts,
} from "./serviceSupport.js";
import {
  credereFinancingProvider as provider,
  redactFinancingConnection,
} from "../../support/connectionSupport.js";
import { bindFinancingOAuthReturnTarget } from "../../support/oauthStateSupport.js";

const oauthTtlMinutes = 10;

export async function startFinancingOAuthTransaction(
  context: ServiceContext,
  ports: FinancingServicePorts,
): Promise<StartFinancingOAuthResult> {
  assertPermission(context, financingConnectionManagePermission);
  const scope = requireAgencyFinancingScope(context);
  const gateway = getFinancingGateway(ports);
  const redirectUri = resolveOAuthRedirectUri(ports);
  const state = bindFinancingOAuthReturnTarget(
    createOpaqueState(),
    context.storeId ? "store" : "agency",
  );
  const codeVerifier = gateway.supportsPkce ? createPkceVerifier() : null;
  const transaction = await ports.repository.createOAuthTransaction({
    codeVerifier,
    expiresAt: addMinutes(now(ports), oauthTtlMinutes),
    provider,
    redirectUri,
    requestedByUserId: context.actor.id,
    stateHash: sha256Hex(state),
    tenantId: scope.tenantId,
  });
  const authorizationUrl = await gateway.createAuthorizationUrl({
    ...(codeVerifier
      ? {
          codeChallenge: sha256Base64Url(codeVerifier),
          codeChallengeMethod: "S256" as const,
        }
      : {}),
    redirectUri,
    state,
  });
  context.logger.info(
    "financing.oauth.started",
    createServiceLogMetadata(context, {
      permission: financingConnectionManagePermission,
      provider,
      usesPkce: Boolean(codeVerifier),
    }),
  );
  await context.audit.record({
    action: "financing.oauth.start",
    actor: context.actor,
    category: "authorization",
    entityId: transaction.id,
    entityType: "financing_oauth_transaction",
    metadata: {
      expiresAt: transaction.expiresAt.toISOString(),
      permission: financingConnectionManagePermission,
      provider,
      stateStoredAsHash: true,
      usesPkce: Boolean(codeVerifier),
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Started financing OAuth transaction",
    tenantId: scope.tenantId,
  });
  return {
    authorizationUrl,
    callbackUri: redirectUri,
    expiresAt: transaction.expiresAt,
    state,
    usesPkce: Boolean(codeVerifier),
  };
}

export async function completeFinancingOAuthCallback(
  context: ServiceContext,
  input: CompleteFinancingOAuthInput,
  ports: FinancingServicePorts,
) {
  assertPermission(context, financingConnectionManagePermission);
  const scope = requireAgencyFinancingScope(context);
  context.logger.info(
    "financing.oauth.complete.started",
    createServiceLogMetadata(context, {
      permission: financingConnectionManagePermission,
      provider,
    }),
  );
  return completeOAuth(input, ports, scope.tenantId, context);
}

export async function completeFinancingOAuthCallbackFromState(
  input: CompleteFinancingOAuthInput,
  ports: FinancingServicePorts,
) {
  return completeOAuth(input, ports, undefined, null);
}

async function completeOAuth(
  input: CompleteFinancingOAuthInput,
  ports: FinancingServicePorts,
  tenantId: TenantId | undefined,
  context: ServiceContext | null,
) {
  const gateway = getFinancingGateway(ports);
  const transaction = await ports.repository.consumeOAuthTransaction({
    provider,
    stateHash: sha256Hex(input.state),
    ...(tenantId ? { tenantId } : {}),
    usedAt: now(ports),
  });
  if (!transaction || transaction.expiresAt.getTime() <= now(ports).getTime()) {
    throw new FinancingOAuthStateInvalidError();
  }
  const token = await gateway.exchangeAuthorizationCode({
    code: input.code,
    ...(transaction.codeVerifier
      ? { codeVerifier: transaction.codeVerifier }
      : {}),
    redirectUri: transaction.redirectUri,
  });
  const connection = await ports.repository.upsertConnection({
    provider,
    providerAccountId: token.providerAccountId,
    status: "connected",
    tenantId: transaction.tenantId,
    token,
  });
  await context?.audit.record({
    action: "financing.oauth.complete",
    actor: context.actor,
    category: "authorization",
    entityId: connection.id,
    entityType: "financing_connection",
    metadata: {
      hasRefreshToken: Boolean(token.refreshToken),
      permission: financingConnectionManagePermission,
      provider,
      providerAccountId: token.providerAccountId,
      transactionId: transaction.id,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Completed financing OAuth callback",
    tenantId: transaction.tenantId,
  });
  return redactFinancingConnection(connection);
}
