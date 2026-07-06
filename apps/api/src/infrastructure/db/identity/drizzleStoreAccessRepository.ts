import { and, eq, isNull, or } from "drizzle-orm";
import {
  membershipPermissionOverrides,
  roleTemplates,
  storeEntitlements,
  storeMemberships,
  stores,
  tenantMemberships,
  users,
} from "@lojaveiculosv2/db";
import type {
  EntitlementKey,
  PermissionKey,
  RoleKey,
  StoreId,
  TenantId,
  UserId,
} from "@lojaveiculosv2/shared";
import type {
  StoreAccessRecord,
  StoreAccessRepository,
} from "../../../domains/identity/ports/storeAccessRepository.js";

type AccessRow = {
  membershipId: string;
  role: RoleKey;
  storeId: StoreId;
  tenantId: TenantId;
  userId: UserId;
};

type OverrideRow = {
  allowed: boolean;
  permission: PermissionKey;
};

type EntitlementRow = {
  entitlement: EntitlementKey;
};

type TenantBillingOwnerRow = {
  role: RoleKey;
};

type SelectLimitBuilder<Row> = {
  limit: (count: number) => Promise<readonly Row[]>;
};

type SelectWhereBuilder<Row> = {
  innerJoin: (table: unknown, condition: unknown) => SelectWhereBuilder<Row>;
  leftJoin: (table: unknown, condition: unknown) => SelectWhereBuilder<Row>;
  limit: (count: number) => Promise<readonly Row[]>;
  where: (condition: unknown) => SelectLimitBuilder<Row>;
};

type SelectFromBuilder<Row> = {
  from: (table: unknown) => SelectWhereBuilder<Row>;
};

export type DrizzleStoreAccessClient = {
  select: {
    (selection: {
      membershipId: unknown;
      role: unknown;
      storeId: unknown;
      tenantId: unknown;
      userId: unknown;
    }): SelectFromBuilder<AccessRow>;
    (selection: {
      allowed: unknown;
      permission: unknown;
    }): SelectFromBuilder<OverrideRow>;
    (selection: { entitlement: unknown }): SelectFromBuilder<EntitlementRow>;
    (selection: { role: unknown }): SelectFromBuilder<TenantBillingOwnerRow>;
  };
};

export function createDrizzleStoreAccessRepository(
  db: DrizzleStoreAccessClient,
): StoreAccessRepository {
  return {
    async findByClerkUserAndStoreSlug(input) {
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

      if (!access) return null;

      const [overrides, entitlements, tenantAgencyMemberships] =
        await Promise.all([
          db
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
            .limit(100),
          db
            .select({
              entitlement: storeEntitlements.featureKey,
            })
            .from(storeEntitlements)
            .where(
              and(
                eq(storeEntitlements.storeId, access.storeId),
                or(
                  eq(storeEntitlements.status, "active"),
                  eq(storeEntitlements.status, "trialing"),
                ),
              ),
            )
            .limit(100),
          db
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
        entitlements: entitlements.map((row) => row.entitlement),
        overrides,
        role: access.role,
        storeId: access.storeId,
        tenantId: access.tenantId,
        userId: access.userId,
      } satisfies StoreAccessRecord;
    },
  };
}
