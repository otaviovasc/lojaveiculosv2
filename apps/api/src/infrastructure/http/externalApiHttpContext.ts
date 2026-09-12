import type { AuditSink } from "@lojaveiculosv2/audit";
import type { ExternalApiRepository } from "../../domains/externalApi/ports/externalApiRepository.js";
import { hashExternalApiKey } from "../../domains/externalApi/crypto/apiKeyCrypto.js";
import {
  createServiceContext,
  type ServiceContext,
  type ServiceLogger,
  type ServiceRequestContext,
} from "../../shared/serviceContext.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "./httpContextErrors.js";
import { enforceExternalApiGovernance } from "./externalApiIdempotencyGovernance.js";
export {
  assertExternalApiAudience,
  isExternalApiAudience,
  readExternalApiKey,
  readExternalApiRequestFingerprint,
} from "./externalApiRequestContext.js";

export const externalApiContextKey = "externalApiContext";

export type ExternalApiHttpContextMetadata = {
  clientId: string;
  idempotencyKey: string | null;
  method: string;
  ownsIdempotencyReservation: boolean;
  path: string;
  requestId: string;
  requestFingerprint: string | null;
  startedAt: number;
  storeId: string;
  tenantId: string;
};

export async function createExternalApiServiceContext(input: {
  apiKey: string;
  audit: AuditSink;
  logger: ServiceLogger;
  onAuthenticated?: (metadata: ExternalApiHttpContextMetadata) => void;
  repository?: ExternalApiRepository;
  request: ServiceRequestContext;
  requestFingerprint?: string;
}): Promise<ServiceContext> {
  if (!input.repository) {
    throw new HttpContextAuthenticationError(
      "External API authentication requires API key repository.",
    );
  }

  const credential = await input.repository.authenticateByKeyHash({
    keyHash: hashExternalApiKey(input.apiKey),
    now: new Date(),
  });

  if (!credential) {
    throw new HttpContextAuthenticationError("Invalid external API key.");
  }
  if (!credential.entitlements.includes("external_api")) {
    throw new HttpContextAuthorizationError(
      "External API entitlement is not active.",
    );
  }

  const httpMetadata: ExternalApiHttpContextMetadata = {
    clientId: credential.clientId,
    idempotencyKey: input.request.idempotencyKey ?? null,
    method: input.request.method ?? "GET",
    ownsIdempotencyReservation: false,
    path: input.request.path ?? "/",
    requestId: input.request.requestId,
    requestFingerprint: null,
    startedAt: Date.now(),
    storeId: credential.storeId,
    tenantId: credential.tenantId,
  };
  input.onAuthenticated?.(httpMetadata);
  const ownedRequestFingerprint = await enforceExternalApiGovernance({
    clientId: credential.clientId,
    repository: input.repository,
    request: input.request,
    ...(input.requestFingerprint
      ? { requestFingerprint: input.requestFingerprint }
      : {}),
    storeId: credential.storeId,
    tenantId: credential.tenantId,
  });
  httpMetadata.ownsIdempotencyReservation = Boolean(ownedRequestFingerprint);
  httpMetadata.requestFingerprint = ownedRequestFingerprint;

  await input.audit.record({
    action: "external_api.authenticate",
    actor: {
      externalId: credential.keyPrefix,
      id: credential.clientId,
      kind: "integration",
    },
    category: "authentication",
    entityId: credential.clientId,
    entityType: "api_client",
    metadata: {
      scopeCount: credential.scopes.length,
    },
    outcome: "succeeded",
    request: input.request,
    requestId: input.request.requestId,
    source: {
      component: "external-api",
      environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
      service: "api",
    },
    storeId: credential.storeId,
    tenantId: credential.tenantId,
    ...(input.request.correlationId
      ? { correlationId: input.request.correlationId }
      : {}),
  });

  const serviceContext = createServiceContext({
    actor: {
      displayName: credential.clientName,
      externalId: credential.keyPrefix,
      id: credential.clientId,
      kind: "integration",
    },
    audit: input.audit,
    logger: input.logger,
    permissions: credential.scopes,
    request: input.request,
    source: {
      component: "external-api",
      environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",
      service: "api",
    },
    storeId: credential.storeId,
    tenantId: credential.tenantId,
  });

  return {
    ...serviceContext,
    entitlements: credential.entitlements,
  } as ServiceContext;
}
