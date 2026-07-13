import type { TenantId } from "@lojaveiculosv2/shared";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import type {
  ClerkUserProfile,
  StoreProfileDraft,
} from "../../ports/accountProvisioningRepository.js";
import {
  AccountProvisioningPolicyError,
  AccountProvisioningScopeError,
  assertVerifiedPrimaryEmail,
  normalizePublicSlug,
  requireClerkActor,
  type AccountProvisioningPorts,
} from "./serviceSupport.js";

export type CreateAgencyStoreInput = {
  profile?: StoreProfileDraft;
  publicSlug: string;
  storeLegalName?: string | null;
  storeTradingName: string;
  tenantId: TenantId;
};

export async function createAgencyStore(
  context: ServiceContext,
  profile: ClerkUserProfile,
  input: CreateAgencyStoreInput,
  ports: AccountProvisioningPorts,
) {
  requireClerkActor(context);
  assertVerifiedPrimaryEmail(profile);
  const tenantId = input.tenantId;
  if (context.tenantId !== tenantId) {
    throw new AccountProvisioningScopeError(
      "Agency store tenant must match the service context.",
    );
  }
  assertPermission(context, "store.manage");

  const actor = await ports.accountProvisioningRepository.ensureUser(profile);
  const [isAgency, isPlatformAdmin] = await Promise.all([
    ports.accountProvisioningRepository.hasActiveTenantRole({
      role: "agency",
      tenantId,
      userId: actor.id,
    }),
    ports.accountProvisioningRepository.hasActivePlatformAdmin(actor.id),
  ]);

  if (!isAgency && !isPlatformAdmin) {
    throw new AccountProvisioningPolicyError(
      "Only agency users or platform admins can create stores for this tenant.",
    );
  }

  const publicSlug = normalizePublicSlug(input.publicSlug);
  context.logger.info(
    "identity.agency_store.create.started",
    createServiceLogMetadata(context, { publicSlug, tenantId }),
  );

  const store = await ports.accountProvisioningRepository.createAgencyStore({
    actorUserId: actor.id,
    ...(input.profile ? { profile: input.profile } : {}),
    publicSlug,
    storeLegalName: input.storeLegalName ?? null,
    storeTradingName: input.storeTradingName.trim(),
    tenantId,
  });

  await context.audit.record({
    action: "identity.agency_store.create",
    actor: { ...context.actor, id: actor.id },
    category: "authorization",
    criticality: "critical",
    entityId: store.storeId,
    entityType: "store",
    metadata: {
      catalogVersion: store.catalogVersion,
      entitlementEndsAt: store.entitlementEndsAt,
      entitlements: store.entitlements,
      role: store.role,
      storeSlug: store.storeSlug,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: store.storeId,
    summary: "Created agency-managed store",
    tenantId: store.tenantId,
  });

  return store;
}
