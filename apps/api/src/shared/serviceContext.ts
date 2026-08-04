import type { AuditFailureTier, AuditSink } from "@lojaveiculosv2/audit";
import type { EntitlementKey, RoleKey } from "@lojaveiculosv2/shared";
import {
  createContextualAuditSink,
  createNoopAuditSink,
  createPolicyAwareAuditSink,
} from "./auditSink.js";
import {
  createNoopServiceLogger,
  type ServiceLogMetadata,
  type ServiceLogger,
} from "./serviceLogger.js";

export type ActorKind = "user" | "system" | "public" | "integration";
export type BillingManagedBy = "agency" | "store_owner";

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
  billingManagedBy?: BillingManagedBy;
  correlationId?: string;
  logger: ServiceLogger;
  membershipRole?: RoleKey;
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
  entitlements?: readonly EntitlementKey[];
  logger?: ServiceLogger;
  billingManagedBy?: BillingManagedBy;
  membershipRole?: RoleKey;
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
  const actor = input.actor ?? { id: "public", kind: "public" };
  const request = {
    ...input.request,
    correlationId: input.request.correlationId ?? input.request.requestId,
  };
  const baseLogger = input.logger ?? createNoopServiceLogger();
  const logger =
    baseLogger.child?.({
      actorExternalId: input.actor?.externalId ?? null,
      actorId: input.actor?.id ?? "public",
      actorKind: input.actor?.kind ?? "public",
      billingManagedBy: input.billingManagedBy ?? null,
      correlationId: request.correlationId,
      membershipRole: input.membershipRole ?? null,
      requestId: request.requestId,
      requestMethod: request.method ?? null,
      requestPath: request.path ?? null,
      service: input.source?.service ?? null,
      storeId: input.storeId ?? null,
      tenantId: input.tenantId ?? null,
      ...(input.source?.component ? { component: input.source.component } : {}),
      ...(input.source?.environment
        ? { environment: input.source.environment }
        : {}),
      ...(input.source?.region ? { region: input.source.region } : {}),
      ...(input.source?.version ? { version: input.source.version } : {}),
    }) ?? baseLogger;

  return {
    actor,
    audit: createPolicyAwareAuditSink({
      sink: createContextualAuditSink({
        actor,
        correlationId: request.correlationId,
        request,
        sink: input.audit ?? createNoopAuditSink(),
        ...(input.source ? { source: input.source } : {}),
        storeId: input.storeId ?? null,
        tenantId: input.tenantId ?? null,
      }),
      logger,
      ...(input.auditFailureTier
        ? { defaultPolicy: input.auditFailureTier }
        : {}),
    }),
    logger,
    ...(input.billingManagedBy
      ? { billingManagedBy: input.billingManagedBy }
      : {}),
    ...(input.entitlements ? { entitlements: [...input.entitlements] } : {}),
    ...(input.membershipRole ? { membershipRole: input.membershipRole } : {}),
    permissions: [...(input.permissions ?? [])],
    request,
    requestId: request.requestId,
    storeId: input.storeId ?? null,
    tenantId: input.tenantId ?? null,
    ...(input.auditFailureTier
      ? { auditFailureTier: input.auditFailureTier }
      : {}),
    correlationId: request.correlationId,
    ...(input.source ? { source: input.source } : {}),
  };
}

export function createServiceLogMetadata(
  context: ServiceContext,
  metadata: ServiceLogMetadata = {},
): ServiceLogMetadata {
  return {
    ...metadata,
    actorExternalId: context.actor.externalId ?? null,
    actorId: context.actor.id,
    actorKind: context.actor.kind,
    billingManagedBy: context.billingManagedBy ?? null,
    correlationId: context.correlationId ?? null,
    membershipRole: context.membershipRole ?? null,
    requestId: context.requestId,
    requestMethod: context.request?.method ?? null,
    requestPath: context.request?.path ?? null,
    service: context.source?.service ?? null,
    storeId: context.storeId,
    tenantId: context.tenantId,
    ...(context.source?.component
      ? { component: context.source.component }
      : {}),
    ...(context.source?.environment
      ? { environment: context.source.environment }
      : {}),
    ...(context.source?.region ? { region: context.source.region } : {}),
    ...(context.source?.version ? { version: context.source.version } : {}),
  };
}
