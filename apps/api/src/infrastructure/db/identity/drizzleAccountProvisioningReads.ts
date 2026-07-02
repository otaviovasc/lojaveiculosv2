import { and, eq } from "drizzle-orm";
import {
  membershipPermissionOverrides,
  platformAdminMemberships,
  roleTemplates,
  storeMemberships,
  stores,
  tenantMemberships,
  tenants,
  users,
} from "@lojaveiculosv2/db";
import type { PermissionKey, RoleKey } from "@lojaveiculosv2/shared";
import { resolvePermissions } from "../../../domains/identity/domain/permissionResolver.js";
import {
  AccountProvisioningConflictError,
  type ClerkUserProfile,
  type IdentityUserSummary,
} from "../../../domains/identity/ports/accountProvisioningRepository.js";
import type { DrizzleAccountProvisioningClient } from "./drizzleAccountProvisioningSupport.js";
import { resolveMembershipPermissions } from "./drizzleAccountProvisioningPermissions.js";
import { toUserSummary } from "./drizzleIdentityMappers.js";
import { resolveStoreEntitlements } from "./drizzleStoreEntitlementReads.js";

export async function ensureUser(
  db: DrizzleAccountProvisioningClient,
  profile: ClerkUserProfile,
): Promise<IdentityUserSummary> {
  const email = profile.email.trim().toLowerCase();
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, profile.clerkUserId))
    .limit(1);
  if (existing) return updateUserProfile(db, existing.id, email, profile.name);
  const [emailOwner] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (emailOwner) {
    throw new AccountProvisioningConflictError(
      "A different Clerk user already owns this email in V2.",
    );
  }
  const [created] = await db
    .insert(users)
    .values({ clerkUserId: profile.clerkUserId, email, name: profile.name })
    .returning();
  if (!created) throw new Error("Failed to create V2 user.");
  return toUserSummary(created);
}

export async function listStores(
  db: DrizzleAccountProvisioningClient,
  userId: string,
) {
  const rows = await db
    .select({
      membershipId: storeMemberships.id,
      role: roleTemplates.roleKey,
      status: storeMemberships.status,
      storeId: stores.id,
      storeName: stores.tradingName,
      storeSlug: stores.publicSlug,
      tenantId: stores.tenantId,
      tenantName: tenants.tradingName,
    })
    .from(storeMemberships)
    .innerJoin(stores, eq(stores.id, storeMemberships.storeId))
    .innerJoin(tenants, eq(tenants.id, stores.tenantId))
    .innerJoin(
      roleTemplates,
      eq(roleTemplates.id, storeMemberships.roleTemplateId),
    )
    .where(
      and(
        eq(storeMemberships.userId, userId),
        eq(stores.isDeleted, false),
        eq(tenants.isDeleted, false),
      ),
    )
    .limit(100);
  return Promise.all(
    rows.map(async (row) => {
      const effectivePermissions = await resolveMembershipPermissions(db, {
        membershipId: row.membershipId,
        role: row.role,
      });
      const entitlements = await resolveStoreEntitlements(db, row.storeId);
      return {
        effectivePermissions,
        entitlements,
        role: row.role,
        status: row.status,
        storeId: row.storeId as never,
        storeName: row.storeName,
        storeSlug: row.storeSlug,
        tenantId: row.tenantId as never,
        tenantName: row.tenantName,
      };
    }),
  );
}

export async function listTenantMemberships(
  db: DrizzleAccountProvisioningClient,
  userId: string,
) {
  const rows = await db
    .select({
      role: roleTemplates.roleKey,
      status: tenantMemberships.status,
      tenantId: tenants.id,
      tenantName: tenants.tradingName,
      tenantSlug: tenants.slug,
    })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
    .innerJoin(
      roleTemplates,
      eq(roleTemplates.id, tenantMemberships.roleTemplateId),
    )
    .where(
      and(eq(tenantMemberships.userId, userId), eq(tenants.isDeleted, false)),
    )
    .limit(100);
  return rows.map((row) => ({ ...row, tenantId: row.tenantId as never }));
}

export async function hasStorePermission(
  db: DrizzleAccountProvisioningClient,
  input: { permission: "users.manage"; storeId: string; userId: string },
) {
  const [membership] = await db
    .select({
      membershipId: storeMemberships.id,
      role: roleTemplates.roleKey,
    })
    .from(storeMemberships)
    .innerJoin(stores, eq(stores.id, storeMemberships.storeId))
    .innerJoin(tenants, eq(tenants.id, stores.tenantId))
    .innerJoin(
      roleTemplates,
      eq(roleTemplates.id, storeMemberships.roleTemplateId),
    )
    .where(
      and(
        eq(storeMemberships.storeId, input.storeId),
        eq(storeMemberships.userId, input.userId),
        eq(storeMemberships.status, "active"),
        eq(stores.isDeleted, false),
        eq(tenants.isDeleted, false),
      ),
    )
    .limit(1);
  if (!membership) return false;
  return (
    await resolveMembershipPermissions(db, {
      membershipId: membership.membershipId,
      role: membership.role,
    })
  ).includes(input.permission);
}

async function resolveMembershipPermissions(
  db: DrizzleAccountProvisioningClient,
  membership: { membershipId: string; role: RoleKey },
) {
  const overrides = await db
    .select({
      allowed: membershipPermissionOverrides.allowed,
      permission: membershipPermissionOverrides.permissionKey,
    })
    .from(membershipPermissionOverrides)
    .where(
      eq(membershipPermissionOverrides.membershipId, membership.membershipId),
    )
    .limit(100);
  return resolvePermissions({
    overrides: overrides.map((override) => ({
      allowed: override.allowed,
      permission: override.permission as PermissionKey,
    })),
    role: membership.role,
  });
}

export async function hasActivePlatformAdmin(
  db: DrizzleAccountProvisioningClient,
  userId: string,
) {
  const [row] = await db
    .select({ id: platformAdminMemberships.id })
    .from(platformAdminMemberships)
    .where(
      and(
        eq(platformAdminMemberships.userId, userId),
        eq(platformAdminMemberships.status, "active"),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function hasActiveTenantRole(
  db: DrizzleAccountProvisioningClient,
  input: { role: RoleKey; tenantId: string; userId: string },
) {
  const [row] = await db
    .select({ id: tenantMemberships.id })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
    .innerJoin(
      roleTemplates,
      eq(roleTemplates.id, tenantMemberships.roleTemplateId),
    )
    .where(
      and(
        eq(tenantMemberships.tenantId, input.tenantId),
        eq(tenantMemberships.userId, input.userId),
        eq(tenantMemberships.status, "active"),
        eq(tenants.isDeleted, false),
        eq(roleTemplates.roleKey, input.role),
      ),
    )
    .limit(1);
  return Boolean(row);
}

async function updateUserProfile(
  db: DrizzleAccountProvisioningClient,
  id: string,
  email: string,
  name: string | null,
) {
  const [updated] = await db
    .update(users)
    .set({ email, name })
    .where(eq(users.id, id))
    .returning();
  if (!updated) throw new Error("Failed to update V2 user.");
  return toUserSummary(updated);
}
