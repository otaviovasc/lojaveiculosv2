import type { AuditFailureTier, AuditSink } from "@lojaveiculosv2/audit";
import type { EntitlementKey } from "@lojaveiculosv2/shared";
import {
  createNoopAuditSink,
  createPolicyAwareAuditSink,
} from "./auditSink.js";
import {
  createNoopServiceLogger,
  type ServiceLogMetadata,
  type ServiceLogger,
} from "./serviceLogger.js";

export type ActorKind = "user" | "system" | "public" | "integration";

export type ServiceActor = {
  displayName?: string;
  externalId?: string;
  id: string;
  kind: ActorKind;
};

export type ServiceRequestContext = {
  causationId?: string;
  correlationId?: string;
  idempotencyKey?: string;
  ipAddress?: string;
  method?: string;
  path?: string;
  requestId: string;
  userAgent?: string;
};

export type ServiceContextSource = {
  component?: string;
  environment?: string;
  region?: string;
  service: string;
  version?: string;
};

export type ServiceContext = {
  actor: ServiceActor;
  audit: AuditSink;
  auditFailureTier?: AuditFailureTier;
  correlationId?: string;
  logger: ServiceLogger;
  permissions: string[];
  request?: ServiceRequestContext;
  requestId: string;
  source?: ServiceContextSource;
  storeId: string | null;
  tenantId: string | null;
};

export type StoreScopedServiceContext = ServiceContext & {
  entitlements: readonly EntitlementKey[];
  storeId: string;
  tenantId: string;
};

export type CreateServiceContextInput = {
  actor?: ServiceActor;
  audit?: AuditSink;
  auditFailureTier?: AuditFailureTier;
  logger?: ServiceLogger;
  permissions?: readonly string[];
  request: ServiceRequestContext;
  source?: ServiceContextSource;
  storeId?: string | null;
  tenantId?: string | null;
};

export type { ServiceLogMetadata, ServiceLogger };
export {
  createConsoleServiceLogger,
  createNoopServiceLogger,
} from "./serviceLogger.js";

export function createServiceContext(
  input: CreateServiceContextInput,
): ServiceContext {
  const logger = input.logger ?? createNoopServiceLogger();

  return {
    actor: input.actor ?? { id: "public", kind: "public" },
    audit: createPolicyAwareAuditSink({
      sink: input.audit ?? createNoopAuditSink(),
      logger,
      ...(input.auditFailureTier
        ? { defaultPolicy: input.auditFailureTier }
        : {}),
    }),
    logger,
    permissions: [...(input.permissions ?? [])],
    request: input.request,
    requestId: input.request.requestId,
    storeId: input.storeId ?? null,
    tenantId: input.tenantId ?? null,
    ...(input.auditFailureTier
      ? { auditFailureTier: input.auditFailureTier }
      : {}),
    ...(input.request.correlationId
      ? { correlationId: input.request.correlationId }
      : {}),
    ...(input.source ? { source: input.source } : {}),
  };
}

export function createServiceLogMetadata(
  context: ServiceContext,
  metadata: ServiceLogMetadata = {},
): ServiceLogMetadata {
  return {
    actorExternalId: context.actor.externalId ?? null,
    actorId: context.actor.id,
    actorKind: context.actor.kind,
    correlationId: context.correlationId ?? null,
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
    ...metadata,
  };
}
