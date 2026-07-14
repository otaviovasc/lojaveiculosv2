import { and, eq, gt, inArray, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  identityInvitations,
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
  RolePendingInvitation,
  RolePermissionOverride,
  UpdateMembershipAccessInput,
} from "../../../domains/identity/ports/roleManagementRepository.js";
import { listActiveStoreMembers } from "./drizzleStoreMemberOptions.js";

export type DrizzleRoleManagementClient = PostgresJsDatabase<typeof schema>;

type MembershipRow = {
  email: string;
  membershipId: string;
  name: string | null;
  role: RoleMembership["role"];
  status: RoleMembership["status"];
  userId: string;
};

type PendingInvitationRow = {
  email: string;
  id: string;
  metadata: unknown;
  role: RolePendingInvitation["role"];
  status: string;
  storeId: string | null;
  tenantId: string;
};

export function createDrizzleRoleManagementRepository(
  db: DrizzleRoleManagementClient,
): RoleManagementRepository {
  return {
    async listActiveMembersByStore(input) {
      return listActiveStoreMembers(db, input);
    },
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
  const now = new Date();
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
  const pendingInvitations = await db
    .select({
      email: identityInvitations.email,
      id: identityInvitations.id,
      metadata: identityInvitations.metadata,
      role: roleTemplates.roleKey,
      status: identityInvitations.status,
      storeId: identityInvitations.storeId,
      tenantId: identityInvitations.tenantId,
    })
    .from(identityInvitations)
    .innerJoin(
      roleTemplates,
      eq(roleTemplates.id, identityInvitations.roleTemplateId),
    )
    .where(
      and(
        eq(identityInvitations.storeId, input.storeId),
        eq(identityInvitations.tenantId, input.tenantId),
        inArray(identityInvitations.status, ["pending", "sent"]),
        or(
          isNull(identityInvitations.expiresAt),
          gt(identityInvitations.expiresAt, now),
        ),
      ),
    )
    .limit(100);
  const overrides = await db.select().from(membershipPermissionOverrides);

  return {
    memberships: memberships.map((row) => toMembership(row, overrides)),
    pendingInvitations: pendingInvitations.map(toPendingInvitation),
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

function toPendingInvitation(row: PendingInvitationRow): RolePendingInvitation {
  if (!row.storeId) {
    throw new Error("Pending store invitation is missing storeId.");
  }
  return {
    email: row.email,
    id: row.id,
    name: readInvitationName(row.metadata),
    role: row.role,
    status: row.status === "pending" ? "pending" : "sent",
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
  };
}

function readInvitationName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const name = (metadata as { name?: unknown }).name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}
