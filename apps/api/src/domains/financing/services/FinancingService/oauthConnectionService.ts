import { randomUUID } from "node:crypto";
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
import { recordFinancingOAuthCallbackAudit } from "../../support/oauthCallbackAudit.js";

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
  input: Extract<CompleteFinancingOAuthInput, { code: string }>,
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
  const result = await completeOAuth(input, ports, scope.tenantId, context);
  if ("kind" in result) throw new FinancingOAuthStateInvalidError();
  return result;
}

export async function completeFinancingOAuthCallbackFromState(
  context: ServiceContext,
  input: CompleteFinancingOAuthInput,
  ports: FinancingServicePorts,
) {
  assertPermission(context, "financing.oauth.callback");
  context.logger.info(
    "financing.oauth.callback.started",
    createServiceLogMetadata(context, {
      permission: "financing.oauth.callback",
      provider,
    }),
  );
  return completeOAuth(input, ports, undefined, context);
}

async function completeOAuth(
  input: CompleteFinancingOAuthInput,
  ports: FinancingServicePorts,
  tenantId: TenantId | undefined,
  context: ServiceContext,
) {
  const usedAt = now(ports);
  if ("error" in input) {
    const transaction = await ports.repository.cancelOAuthTransaction({
      provider,
      stateHash: sha256Hex(input.state),
      ...(tenantId ? { tenantId } : {}),
      usedAt,
    });
    if (!transaction) throw new FinancingOAuthStateInvalidError();
    await recordFinancingOAuthCallbackAudit(context, transaction, "cancelled");
    return { kind: "cancelled" as const, provider };
  }

  const gateway = getFinancingGateway(ports);
  const leaseOwner = randomUUID();
  const transaction = await ports.repository.claimOAuthTransaction({
    leaseExpiresAt: new Date(usedAt.getTime() + 60_000),
    leaseOwner,
    provider,
    stateHash: sha256Hex(input.state),
    ...(tenantId ? { tenantId } : {}),
    usedAt,
  });
  if (!transaction) {
    throw new FinancingOAuthStateInvalidError();
  }
  try {
    const token =
      transaction.exchangeToken ??
      (await gateway.exchangeAuthorizationCode({
        code: input.code,
        ...(transaction.codeVerifier
          ? { codeVerifier: transaction.codeVerifier }
          : {}),
        redirectUri: transaction.redirectUri,
      }));
    if (
      !transaction.exchangeToken &&
      !(await ports.repository.saveOAuthExchangeToken({
        leaseOwner,
        token,
        transactionId: transaction.id,
      }))
    ) {
      throw new FinancingOAuthStateInvalidError();
    }
    const connection = await ports.repository.upsertConnection({
      provider,
      providerAccountId: token.providerAccountId,
      status: "connected",
      tenantId: transaction.tenantId,
      token,
    });
    if (
      !(await ports.repository.finishOAuthTransaction({
        leaseOwner,
        succeeded: true,
        transactionId: transaction.id,
        usedAt: now(ports),
      }))
    ) {
      throw new FinancingOAuthStateInvalidError();
    }
    await context.audit.record({
      action: "financing.oauth.complete",
      actor: context.actor,
      category: "authorization",
      entityId: connection.id,
      entityType: "financing_connection",
      metadata: {
        hasRefreshToken: Boolean(token.refreshToken),
        permission:
          context.actor.kind === "public"
            ? "financing.oauth.callback"
            : financingConnectionManagePermission,
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
  } catch (error) {
    await ports.repository.finishOAuthTransaction({
      leaseOwner,
      succeeded: false,
      transactionId: transaction.id,
      usedAt: now(ports),
    });
    await recordFinancingOAuthCallbackAudit(context, transaction, "failed");
    throw error;
  }
}
