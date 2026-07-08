import { eq } from "drizzle-orm";
import { stores, tenants, users } from "@lojaveiculosv2/db";
import {
  AccountProvisioningConflictError,
  type AccountProvisioningRepository,
  type CreateAgencyRecordInput,
  type CreateAgencyStoreRecordInput,
  type CreateOwnerStoreRecordInput,
  type CreateStoreInvitationRecordInput,
  type IdentityInvitationRecord,
  type ProvisionedStoreRecord,
  type SessionBootstrapRecord,
} from "../../../domains/identity/ports/accountProvisioningRepository.js";
import { insertBillingDefaults } from "./drizzleAccountProvisioningBilling.js";
import { lockUserProvisioning } from "./drizzleAccountProvisioningLocks.js";
import {
  assertSlugsAvailable,
  assertStoreSlugAvailable,
  assertTenantSlugAvailable,
  canCreateOwnerStore,
  claimInvitations,
  ensureUser,
  findInvitationById,
  findActiveStoreRole,
  findRoleTemplateId,
  hasStorePermission,
  hasActivePlatformAdmin,
  hasActiveTenantRole,
  insertInvitation,
  insertStoreDefaults,
  insertStoreMembership,
  insertTenantMembership,
  listStores,
  listTenantMemberships,
  markInvitationSent,
  markInvitationSendFailed,
  toProvisionedStore,
  type DrizzleAccountProvisioningClient,
} from "./drizzleAccountProvisioningSupport.js";

export type { DrizzleAccountProvisioningClient };

export function createDrizzleAccountProvisioningRepository(
  db: DrizzleAccountProvisioningClient,
): AccountProvisioningRepository {
  return {
    createAgency: (input) => createAgency(db, input),
    createAgencyStore: (input) => createAgencyStore(db, input),
    createOwnerStore: (input) => createOwnerStore(db, input),
    createStoreInvitation: (input) => createStoreInvitation(db, input),
    canCreateOwnerStore: (userId) => canCreateOwnerStore(db, userId),
    ensureUser: (profile) => ensureUser(db, profile),
    findActiveStoreRole: (input) => findActiveStoreRole(db, input),
    findInvitationById: (invitationId) => findInvitationById(db, invitationId),
    findSessionBootstrap: (profile) => findSessionBootstrap(db, profile),
    hasActivePlatformAdmin: (userId) => hasActivePlatformAdmin(db, userId),
    hasStorePermission: (input) => hasStorePermission(db, input),
    hasActiveTenantRole: (input) => hasActiveTenantRole(db, input),
    markInvitationSendFailed: (input) => markInvitationSendFailed(db, input),
    markInvitationSent: (input) => markInvitationSent(db, input),
  };
}

async function findSessionBootstrap(
  db: DrizzleAccountProvisioningClient,
  profile: Parameters<AccountProvisioningRepository["findSessionBootstrap"]>[0],
): Promise<SessionBootstrapRecord> {
  return db.transaction(async (transaction) => {
    const tx = transaction as DrizzleAccountProvisioningClient;
    const user = await ensureUser(tx, profile);
    const acceptedInvitations = await claimInvitations(tx, user);
    const [storesList, tenantList, platformAdmin] = await Promise.all([
      listStores(tx, user.id),
      listTenantMemberships(tx, user.id),
      hasActivePlatformAdmin(tx, user.id),
    ]);

    return {
      defaultStore:
        storesList.find(
          (item) => item.status === "active" && item.role !== "agency",
        ) ?? null,
      acceptedInvitations,
      needsOnboarding:
        !platformAdmin && storesList.length === 0 && tenantList.length === 0,
      platformAdmin,
      stores: storesList,
      tenantMemberships: tenantList,
      user,
    };
  });
}

async function createOwnerStore(
  db: DrizzleAccountProvisioningClient,
  input: CreateOwnerStoreRecordInput,
): Promise<ProvisionedStoreRecord> {
  return db.transaction(async (transaction) => {
    const tx = transaction as DrizzleAccountProvisioningClient;
    const user = await ensureUser(tx, input.user);
    await lockUserProvisioning(tx, user.id);
    if (!(await canCreateOwnerStore(tx, user.id))) {
      throw new AccountProvisioningConflictError(
        "This user already has account access.",
      );
    }
    await assertSlugsAvailable(tx, input.tenantSlug, input.publicSlug);
    const roleTemplateId = await findRoleTemplateId(tx, "owner");
    const [tenant] = await tx
      .insert(tenants)
      .values({
        legalName: input.tenantLegalName ?? input.tenantTradingName,
        slug: input.tenantSlug,
        tradingName: input.tenantTradingName,
      })
      .returning();
    if (!tenant) throw new Error("Failed to create tenant.");
    const [store] = await tx
      .insert(stores)
      .values({
        legalName: input.storeLegalName,
        primaryDomain: `${input.publicSlug}.lojaveiculos.com.br`,
        publicSlug: input.publicSlug,
        tenantId: tenant.id,
        tradingName: input.storeTradingName,
      })
      .returning();
    if (!store) throw new Error("Failed to create store.");

    await tx
      .update(users)
      .set({ tenantId: tenant.id })
      .where(eq(users.id, user.id));
    await insertTenantMembership(tx, tenant.id, user.id, roleTemplateId);
    await insertStoreMembership(
      tx,
      tenant.id,
      store.id,
      user.id,
      roleTemplateId,
    );
    await insertStoreDefaults(
      tx,
      tenant.id,
      store.id,
      input.profile,
      input.entitlements,
    );
    await insertBillingDefaults(tx, tenant, store, input.profile);
    return toProvisionedStore(tenant, store, "owner");
  });
}

async function createAgency(
  db: DrizzleAccountProvisioningClient,
  input: CreateAgencyRecordInput,
) {
  return db.transaction(async (transaction) => {
    const tx = transaction as DrizzleAccountProvisioningClient;
    await assertTenantSlugAvailable(tx, input.tenantSlug);
    const [tenant] = await tx
      .insert(tenants)
      .values({
        legalName: input.tenantLegalName ?? input.tenantTradingName,
        slug: input.tenantSlug,
        tradingName: input.tenantTradingName,
      })
      .returning();
    if (!tenant) throw new Error("Failed to create agency tenant.");
    const invitation = input.firstUser
      ? await insertInvitation(tx, {
          email: input.firstUser.email,
          invitedByUserId: input.invitedByUserId,
          name: input.firstUser.name ?? null,
          role: "agency",
          storeId: null,
          tenantId: tenant.id,
        })
      : null;
    return {
      invitationId: invitation?.id ?? null,
      invitationStatus: invitation?.status ?? null,
      tenantId: tenant.id as never,
      tenantName: tenant.tradingName,
      tenantSlug: tenant.slug,
    };
  });
}

async function createAgencyStore(
  db: DrizzleAccountProvisioningClient,
  input: CreateAgencyStoreRecordInput,
): Promise<ProvisionedStoreRecord> {
  return db.transaction(async (transaction) => {
    const tx = transaction as DrizzleAccountProvisioningClient;
    await assertStoreSlugAvailable(tx, input.publicSlug);
    const [tenant] = await tx
      .select()
      .from(tenants)
      .where(eq(tenants.id, input.tenantId))
      .limit(1);
    if (!tenant)
      throw new AccountProvisioningConflictError("Tenant not found.");
    if (tenant.isDeleted) {
      throw new AccountProvisioningConflictError("Tenant not found.");
    }
    const roleTemplateId = await findRoleTemplateId(tx, "agency");
    const [store] = await tx
      .insert(stores)
      .values({
        legalName: input.storeLegalName,
        primaryDomain: `${input.publicSlug}.lojaveiculos.com.br`,
        publicSlug: input.publicSlug,
        tenantId: input.tenantId,
        tradingName: input.storeTradingName,
      })
      .returning();
    if (!store) throw new Error("Failed to create agency store.");

    await insertStoreMembership(
      tx,
      input.tenantId,
      store.id,
      input.actorUserId,
      roleTemplateId,
    );
    await insertStoreDefaults(
      tx,
      input.tenantId,
      store.id,
      input.profile,
      input.entitlements,
    );
    await insertBillingDefaults(tx, tenant, store, input.profile);
    return toProvisionedStore(tenant, store, "agency");
  });
}

async function createStoreInvitation(
  db: DrizzleAccountProvisioningClient,
  input: CreateStoreInvitationRecordInput,
): Promise<IdentityInvitationRecord> {
  return db.transaction(async (transaction) =>
    insertInvitation(transaction as DrizzleAccountProvisioningClient, input),
  );
}
