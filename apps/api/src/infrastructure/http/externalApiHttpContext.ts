import type { AuditSink } from "@lojaveiculosv2/audit";
import type { Context } from "hono";
import type { ExternalApiRepository } from "../../domains/externalApi/ports/externalApiRepository.js";
import {
  hashExternalApiKey,
  readExternalApiKeyFromAuthorizationHeader,
} from "../../domains/externalApi/crypto/apiKeyCrypto.js";
import {
  createServiceContext,
  type ServiceContext,
  type ServiceLogger,
  type ServiceRequestContext,
} from "../../shared/serviceContext.js";
import {
  HttpContextAuthenticationError,
  HttpContextRequestPolicyError,
} from "./httpContextErrors.js";

export const externalApiContextKey = "externalApiContext";

export type ExternalApiHttpContextMetadata = {
  clientId: string;
  idempotencyKey: string | null;
  method: string;
  path: string;
  requestId: string;
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

  await enforceExternalApiGovernance({
    clientId: credential.clientId,
    repository: input.repository,
    request: input.request,
    storeId: credential.storeId,
    tenantId: credential.tenantId,
  });
  input.onAuthenticated?.({
    clientId: credential.clientId,
    idempotencyKey: input.request.idempotencyKey ?? null,
    method: input.request.method ?? "GET",
    path: input.request.path ?? "/",
    requestId: input.request.requestId,
    startedAt: Date.now(),
    storeId: credential.storeId,
    tenantId: credential.tenantId,
  });

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
    requestId: input.request.requestId,
    storeId: credential.storeId,
    tenantId: credential.tenantId,
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

async function enforceExternalApiGovernance(input: {
  clientId: string;
  repository: ExternalApiRepository;
  request: ServiceRequestContext;
  storeId: string;
  tenantId: string;
}): Promise<void> {
  const limit = Number(process.env.EXTERNAL_API_RATE_LIMIT_PER_MINUTE ?? 120);
  const recentRequests = await input.repository.countRecentRequests({
    clientId: input.clientId,
    since: new Date(Date.now() - 60_000),
  });
  if (recentRequests >= limit) {
    throw new HttpContextRequestPolicyError(
      "External API rate limit exceeded.",
      429,
    );
  }

  const method = input.request.method ?? "GET";
  if (!requiresIdempotencyKey(method)) return;
  const idempotencyKey = input.request.idempotencyKey;
  if (!idempotencyKey) {
    throw new HttpContextRequestPolicyError(
      "External API mutations require Idempotency-Key header.",
      400,
    );
  }

  const reservation = await input.repository.reserveIdempotencyKey({
    clientId: input.clientId,
    idempotencyKey,
    method,
    path: input.request.path ?? "/",
    requestFingerprint: createRequestFingerprint(input.request),
    requestId: input.request.requestId,
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
  });

  if (reservation.kind === "conflict") {
    throw new HttpContextRequestPolicyError(
      "Idempotency-Key was already used for a different request.",
      409,
    );
  }

  if (reservation.kind === "duplicate") {
    throw new HttpContextRequestPolicyError(
      "Idempotency-Key was already used for this request.",
      409,
    );
  }
}

function createRequestFingerprint(request: ServiceRequestContext): string {
  return [request.method ?? "GET", request.path ?? "/"].join(":");
}

function requiresIdempotencyKey(method: string): boolean {
  return ["DELETE", "PATCH", "POST", "PUT"].includes(method.toUpperCase());
}

export function readExternalApiKey(context: Context): string | null {
  return (
    context.req.header("x-api-key") ??
    readExternalApiKeyFromAuthorizationHeader(
      context.req.header("authorization"),
    )
  );
}
