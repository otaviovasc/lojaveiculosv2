import type { AuditFailureTier, AuditSink } from "@lojaveiculosv2/audit";
import type { EntitlementKey, RoleKey } from "@lojaveiculosv2/shared";
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
    ...(input.billingManagedBy
      ? { billingManagedBy: input.billingManagedBy }
      : {}),
    ...(input.membershipRole ? { membershipRole: input.membershipRole } : {}),
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
    billingManagedBy: context.billingManagedBy ?? null,
    correlationId: context.correlationId ?? null,
    membershipRole: context.membershipRole ?? null,
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
    ...metadata,
  };
}
