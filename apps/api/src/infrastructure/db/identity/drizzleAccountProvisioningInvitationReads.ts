import { and, eq, gt, isNull, or } from "drizzle-orm";
import {
  identityInvitations,
  roleTemplates,
  stores,
  tenants,
  users,
} from "@lojaveiculosv2/db";
import type { IdentityUserSummary } from "../../../domains/identity/ports/accountProvisioningRepository.js";
import type { DrizzleAccountProvisioningClient } from "./drizzleAccountProvisioningSupport.js";
import {
  insertStoreMembership,
  insertTenantMembership,
} from "./drizzleAccountProvisioningWrites.js";

export async function claimInvitations(
  db: DrizzleAccountProvisioningClient,
  user: IdentityUserSummary,
) {
  const now = new Date();
  const invitations = await db
    .select({
      email: identityInvitations.email,
      id: identityInvitations.id,
      role: roleTemplates.roleKey,
      roleTemplateId: identityInvitations.roleTemplateId,
      storeId: identityInvitations.storeId,
      tenantId: identityInvitations.tenantId,
    })
    .from(identityInvitations)
    .innerJoin(
      roleTemplates,
      eq(roleTemplates.id, identityInvitations.roleTemplateId),
    )
    .innerJoin(tenants, eq(tenants.id, identityInvitations.tenantId))
    .leftJoin(stores, eq(stores.id, identityInvitations.storeId))
    .where(
      and(
        eq(identityInvitations.email, user.email),
        eq(identityInvitations.status, "sent"),
        eq(tenants.isDeleted, false),
        or(isNull(identityInvitations.storeId), eq(stores.isDeleted, false)),
        or(
          isNull(identityInvitations.expiresAt),
          gt(identityInvitations.expiresAt, now),
        ),
      ),
    )
    .limit(50);
  const accepted = [];
  for (const invitation of invitations) {
    const acceptedInvitation = await acceptInvitation(
      db,
      invitation.id,
      invitation.tenantId,
      user.id,
    );
    if (!acceptedInvitation) continue;
    if (invitation.storeId) {
      await insertStoreMembership(
        db,
        invitation.tenantId,
        invitation.storeId,
        user.id,
        invitation.roleTemplateId,
      );
    } else {
      await insertTenantMembership(
        db,
        invitation.tenantId,
        user.id,
        invitation.roleTemplateId,
      );
    }
    accepted.push(invitation);
  }
  return accepted.map((invitation) => ({
    email: invitation.email,
    id: invitation.id,
    role: invitation.role,
    status: "accepted" as const,
    storeId: invitation.storeId as never,
    tenantId: invitation.tenantId as never,
  }));
}

export async function findInvitationById(
  db: DrizzleAccountProvisioningClient,
  invitationId: string,
) {
  const [row] = await db
    .select({
      email: identityInvitations.email,
      id: identityInvitations.id,
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
    .innerJoin(tenants, eq(tenants.id, identityInvitations.tenantId))
    .leftJoin(stores, eq(stores.id, identityInvitations.storeId))
    .where(
      and(
        eq(identityInvitations.id, invitationId),
        eq(tenants.isDeleted, false),
        or(isNull(identityInvitations.storeId), eq(stores.isDeleted, false)),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    ...row,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
  };
}

async function acceptInvitation(
  db: DrizzleAccountProvisioningClient,
  invitationId: string,
  tenantId: string,
  userId: string,
) {
  const updated = await db
    .update(identityInvitations)
    .set({ acceptedAt: new Date(), status: "accepted" })
    .where(
      and(
        eq(identityInvitations.id, invitationId),
        eq(identityInvitations.status, "sent"),
      ),
    )
    .returning({ id: identityInvitations.id });
  if (updated.length === 0) return false;
  await db
    .update(users)
    .set({ tenantId })
    .where(and(eq(users.id, userId), isNull(users.tenantId)));
  return true;
}
