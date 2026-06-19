import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  membershipPermissionOverrides,
  roleTemplates,
  storeMemberships,
  users,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  RoleManagementRepository,
  RoleManagementState,
  RoleMembership,
  RolePermissionOverride,
  UpdateMembershipAccessInput,
} from "../../../domains/identity/ports/roleManagementRepository.js";

export type DrizzleRoleManagementClient = PostgresJsDatabase<typeof schema>;

type MembershipRow = {
  email: string;
  membershipId: string;
  name: string | null;
  role: RoleMembership["role"];
  status: RoleMembership["status"];
  userId: string;
};

export function createDrizzleRoleManagementRepository(
  db: DrizzleRoleManagementClient,
): RoleManagementRepository {
  return {
    async listByStore(input) {
      return listByStore(db, input);
    },
    async updateMembershipAccess(input) {
      return db.transaction(async (transaction) => {
        const tx = transaction as DrizzleRoleManagementClient;
        const roleTemplateId = await findRoleTemplateId(tx, input.role);

        await tx
          .update(storeMemberships)
          .set({ roleTemplateId })
          .where(
            and(
              eq(storeMemberships.id, input.membershipId),
              eq(storeMemberships.storeId, input.storeId),
              eq(storeMemberships.tenantId, input.tenantId),
            ),
          );
        await tx
          .delete(membershipPermissionOverrides)
          .where(
            eq(membershipPermissionOverrides.membershipId, input.membershipId),
          );

        if (input.overrides.length) {
          await tx.insert(membershipPermissionOverrides).values(
            input.overrides.map((override) => ({
              allowed: override.allowed,
              membershipId: input.membershipId,
              permissionKey: override.permission,
              reason: override.reason,
            })),
          );
        }

        return listByStore(tx, input);
      });
    },
  };
}

async function listByStore(
  db: DrizzleRoleManagementClient,
  input: { storeId: string; tenantId: string },
): Promise<RoleManagementState> {
  const memberships = await db
    .select({
      email: users.email,
      membershipId: storeMemberships.id,
      name: users.name,
      role: roleTemplates.roleKey,
      status: storeMemberships.status,
      userId: users.id,
    })
    .from(storeMemberships)
    .innerJoin(users, eq(users.id, storeMemberships.userId))
    .innerJoin(
      roleTemplates,
      eq(roleTemplates.id, storeMemberships.roleTemplateId),
    )
    .where(
      and(
        eq(storeMemberships.storeId, input.storeId),
        eq(storeMemberships.tenantId, input.tenantId),
      ),
    )
    .limit(200);
  const overrides = await db.select().from(membershipPermissionOverrides);

  return {
    memberships: memberships.map((row) => toMembership(row, overrides)),
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
  };
}

async function findRoleTemplateId(
  db: DrizzleRoleManagementClient,
  role: RoleMembership["role"],
): Promise<string> {
  const [template] = await db
    .select({ id: roleTemplates.id })
    .from(roleTemplates)
    .where(eq(roleTemplates.roleKey, role))
    .limit(1);
  if (!template) throw new Error(`Role template not found: ${role}`);
  return template.id;
}

function toMembership(
  row: MembershipRow,
  overrides: {
    allowed: boolean;
    membershipId: string;
    permissionKey: string;
    reason: string | null;
  }[],
): RoleMembership {
  return {
    membershipId: row.membershipId as never,
    overrides: overrides
      .filter((override) => override.membershipId === row.membershipId)
      .map(toOverride),
    role: row.role,
    status: row.status,
    user: {
      email: row.email,
      id: row.userId as never,
      name: row.name,
    },
  };
}

function toOverride(row: {
  allowed: boolean;
  permissionKey: string;
  reason: string | null;
}): RolePermissionOverride {
  return {
    allowed: row.allowed,
    permission: row.permissionKey as never,
    reason: row.reason,
  };
}
