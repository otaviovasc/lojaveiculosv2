import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import {
  membershipPermissionOverrides,
  roleTemplates,
  storeEntitlements,
  storeMemberships,
  stores,
  tenantMemberships,
  users,
} from "@lojaveiculosv2/db";
import type { RoleKey } from "@lojaveiculosv2/shared";
import type {
  StoreAccessRecord,
  StoreAccessRepository,
} from "../../../domains/identity/ports/storeAccessRepository.js";

import type {
  AccessRow,
  AgencyTenantAccessRow,
  DrizzleStoreAccessClient,
  EntitlementRow,
} from "./drizzleStoreAccessTypes.js";

export type { DrizzleStoreAccessClient } from "./drizzleStoreAccessTypes.js";

type ResolvedAccessRow = AgencyTenantAccessRow & {
  membershipId: string | null;
};

export function createDrizzleStoreAccessRepository(
  db: DrizzleStoreAccessClient,
  now: () => Date = () => new Date(),
): StoreAccessRepository {
  return {
    async findByClerkUserAndStoreSlug(input) {
      const access =
        (await findDirectStoreAccess(db, input)) ??
        (await findAgencyTenantStoreAccess(db, input));

      if (!access) return null;

      const checkedAt = now();
      const [overrides, entitlementRows, tenantAgencyMemberships] =
        await Promise.all([
          access.membershipId
            ? db
                .select({
                  allowed: membershipPermissionOverrides.allowed,
                  permission: membershipPermissionOverrides.permissionKey,
                })
                .from(membershipPermissionOverrides)
                .where(
                  eq(
                    membershipPermissionOverrides.membershipId,
                    access.membershipId,
                  ),
                )
                .limit(100)
            : Promise.resolve([]),
          db
            .select({
              endsAt: storeEntitlements.endsAt,
              entitlement: storeEntitlements.featureKey,
              startsAt: storeEntitlements.startsAt,
            })
            .from(storeEntitlements)
            .where(
              and(
                eq(storeEntitlements.storeId, access.storeId),
                eq(storeEntitlements.tenantId, access.tenantId),
                or(
                  eq(storeEntitlements.status, "active"),
                  eq(storeEntitlements.status, "trialing"),
                ),
                or(
                  isNull(storeEntitlements.startsAt),
                  lte(storeEntitlements.startsAt, checkedAt),
                ),
                or(
                  isNull(storeEntitlements.endsAt),
                  gt(storeEntitlements.endsAt, checkedAt),
                ),
              ),
            )
            .limit(100),
          access.role === "agency"
            ? Promise.resolve([{ role: "agency" as const }])
            : db
                .select({ role: roleTemplates.roleKey })
                .from(tenantMemberships)
                .innerJoin(
                  roleTemplates,
                  eq(roleTemplates.id, tenantMemberships.roleTemplateId),
                )
                .where(
                  and(
                    eq(tenantMemberships.tenantId, access.tenantId),
                    eq(tenantMemberships.status, "active"),
                    eq(roleTemplates.roleKey, "agency"),
                  ),
                )
                .limit(1),
        ]);

      return {
        billingManagedBy: tenantAgencyMemberships.length
          ? "agency"
          : "store_owner",
        entitlements: entitlementRows
          .filter((row) => isEffectiveEntitlement(row, checkedAt))
          .map((row) => row.entitlement),
        overrides,
        role: access.role,
        storeId: access.storeId,
        tenantId: access.tenantId,
        userId: access.userId,
      } satisfies StoreAccessRecord;
    },
  };
}

function isEffectiveEntitlement(row: EntitlementRow, now: Date) {
  return (
    (!row.startsAt || row.startsAt <= now) && (!row.endsAt || row.endsAt > now)
  );
}

async function findDirectStoreAccess(
  db: DrizzleStoreAccessClient,
  input: { clerkUserId: string; storeSlug: string },
): Promise<ResolvedAccessRow | null> {
  const [access] = await db
    .select({
      membershipId: storeMemberships.id,
      role: roleTemplates.roleKey,
      storeId: stores.id,
      tenantId: stores.tenantId,
      userId: users.id,
    })
    .from(users)
    .innerJoin(stores, eq(stores.publicSlug, input.storeSlug))
    .innerJoin(
      storeMemberships,
      and(
        eq(storeMemberships.storeId, stores.id),
        eq(storeMemberships.userId, users.id),
        eq(storeMemberships.status, "active"),
      ),
    )
    .innerJoin(
      roleTemplates,
      eq(roleTemplates.id, storeMemberships.roleTemplateId),
    )
    .where(
      and(
        eq(users.clerkUserId, input.clerkUserId),
        eq(users.isDeleted, false),
        eq(stores.isDeleted, false),
        isNull(users.deletedAt),
        isNull(stores.deletedAt),
      ),
    )
    .limit(1);
  return access ? { ...access, membershipId: access.membershipId } : null;
}

async function findAgencyTenantStoreAccess(
  db: DrizzleStoreAccessClient,
  input: { clerkUserId: string; storeSlug: string },
): Promise<ResolvedAccessRow | null> {
  const [access] = await db
    .select({
      role: roleTemplates.roleKey,
      storeId: stores.id,
      tenantId: stores.tenantId,
      userId: users.id,
    })
    .from(users)
    .innerJoin(
      tenantMemberships,
      and(
        eq(tenantMemberships.userId, users.id),
        eq(tenantMemberships.status, "active"),
      ),
    )
    .innerJoin(
      roleTemplates,
      and(
        eq(roleTemplates.id, tenantMemberships.roleTemplateId),
        eq(roleTemplates.roleKey, "agency"),
      ),
    )
    .innerJoin(
      stores,
      and(
        eq(stores.tenantId, tenantMemberships.tenantId),
        eq(stores.publicSlug, input.storeSlug),
        eq(stores.isDeleted, false),
        isNull(stores.deletedAt),
      ),
    )
    .where(
      and(
        eq(users.clerkUserId, input.clerkUserId),
        eq(users.isDeleted, false),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);
  return access ? { ...access, membershipId: null } : null;
}
