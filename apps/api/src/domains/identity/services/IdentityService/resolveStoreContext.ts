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

  const permissions = resolveBillingAuthorityPermissions({
    overrides: access.overrides,
    billingManagedBy: access.billingManagedBy,
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
    billingManagedBy: access.billingManagedBy,
    entitlements: access.entitlements,
    logger: input.logger,
    membershipRole: access.role,
    permissions,
    requestId: input.requestId,
    storeId: access.storeId,
    tenantId: access.tenantId,
  };
}

function resolveBillingAuthorityPermissions(input: {
  billingManagedBy: "agency" | "store_owner";
  overrides: Parameters<typeof resolvePermissions>[0]["overrides"];
  role: Parameters<typeof resolvePermissions>[0]["role"];
}) {
  const permissions = resolvePermissions({
    role: input.role,
    ...(input.overrides ? { overrides: input.overrides } : {}),
  });

  if (input.billingManagedBy !== "agency" || input.role === "agency") {
    return permissions;
  }

  return permissions.filter((permission) => permission !== "billing.manage");
}
