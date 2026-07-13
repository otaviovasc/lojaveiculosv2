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
  assertVerifiedPrimaryEmail,
  normalizePublicSlug,
  requireClerkActor,
  type AccountProvisioningPorts,
} from "./serviceSupport.js";

export type CreateOwnerStoreInput = {
  profile?: StoreProfileDraft;
  publicSlug: string;
  storeLegalName?: string | null;
  storeTradingName: string;
  tenantLegalName?: string | null;
  tenantTradingName?: string | null;
};

export async function createOwnerStore(
  context: ServiceContext,
  profile: ClerkUserProfile,
  input: CreateOwnerStoreInput,
  ports: AccountProvisioningPorts,
) {
  requireClerkActor(context);
  assertVerifiedPrimaryEmail(profile);
  assertPermission(context, "identity.owner_store.create");
  const publicSlug = normalizePublicSlug(input.publicSlug);
  const tenantTradingName =
    input.tenantTradingName?.trim() || input.storeTradingName.trim();

  context.logger.info(
    "identity.owner_store.create.started",
    createServiceLogMetadata(context, { publicSlug }),
  );

  const store = await ports.accountProvisioningRepository.createOwnerStore({
    ...(input.profile ? { profile: input.profile } : {}),
    publicSlug,
    storeLegalName: input.storeLegalName ?? null,
    storeTradingName: input.storeTradingName.trim(),
    tenantLegalName: input.tenantLegalName ?? input.storeLegalName ?? null,
    tenantSlug: publicSlug,
    tenantTradingName,
    user: profile,
  });

  await context.audit.record({
    action: "identity.owner_store.create",
    actor: {
      ...context.actor,
      externalId: profile.clerkUserId,
    },
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
    summary: "Created self-serve owner account and first store",
    tenantId: store.tenantId,
  });

  return store;
}
