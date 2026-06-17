import type { AuditSink } from "@lojaveiculosv2/audit";
import type { EntitlementKey } from "@lojaveiculosv2/shared";
import { resolvePermissions } from "../../domain/accessPolicy.js";
import type { StoreAccessRepository } from "../../ports/storeAccessRepository.js";
import type {
  ServiceActor,
  ServiceContext,
  ServiceLogger,
} from "../../../../shared/serviceContext.js";

export type ResolveStoreContextInput = {
  actor: ServiceActor;
  audit: AuditSink;
  clerkUserId: string;
  logger: ServiceLogger;
  requestId: string;
  repository: StoreAccessRepository;
  storeSlug: string;
};

export type ResolvedStoreContext = ServiceContext & {
  entitlements: readonly EntitlementKey[];
};

export class StoreAccessDeniedError extends Error {
  constructor() {
    super("Store access denied");
    this.name = "StoreAccessDeniedError";
  }
}

export async function resolveStoreContext(
  input: ResolveStoreContextInput,
): Promise<ResolvedStoreContext> {
  const access = await input.repository.findByClerkUserAndStoreSlug({
    clerkUserId: input.clerkUserId,
    storeSlug: input.storeSlug,
  });

  if (!access) {
    input.logger.warn("identity.context.denied", {
      actorId: input.actor.id,
      requestId: input.requestId,
      storeSlug: input.storeSlug,
    });

    throw new StoreAccessDeniedError();
  }

  const permissions = resolvePermissions({
    overrides: access.overrides,
    role: access.role,
  });
  const actor: ServiceActor = {
    ...input.actor,
    externalId: input.actor.externalId ?? input.clerkUserId,
    id: access.userId,
  };

  await input.audit.record({
    action: "identity.context.resolve",
    actor,
    entityId: access.storeId,
    entityType: "store",
    requestId: input.requestId,
    storeId: access.storeId,
    tenantId: access.tenantId,
  });

  return {
    actor,
    audit: input.audit,
    entitlements: access.entitlements,
    logger: input.logger,
    permissions,
    requestId: input.requestId,
    storeId: access.storeId,
    tenantId: access.tenantId,
  };
}
