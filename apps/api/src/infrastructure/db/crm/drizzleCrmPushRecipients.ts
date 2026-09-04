import { and, eq } from "drizzle-orm";
import {
  crmPushPreferences,
  crmPushSubscriptions,
  membershipPermissionOverrides,
  roleTemplates,
  storeMemberships,
  users,
} from "@lojaveiculosv2/db";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import type {
  CrmPushRecipientCandidate,
  CrmPushScope,
} from "../../../domains/crm/ports/crmPushRepository.js";
import { resolvePermissions } from "../../../domains/identity/domain/permissionResolver.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

type RecipientRow = {
  membershipId: string;
  membershipStatus: string;
  overrideAllowed: boolean | null;
  overridePermission: string | null;
  preferenceEnabled: boolean | null;
  role: "admin" | "agency" | "investor" | "owner" | "salesman" | "supervisor";
  subscriptionEnabled: boolean | null;
  subscriptionId: string | null;
  userDeleted: boolean;
  userId: string;
};

export async function listCrmPushRecipientCandidates(
  db: DrizzleCrmClient,
  input: CrmPushScope & { assignedUserId: string | null },
): Promise<readonly CrmPushRecipientCandidate[]> {
  void input.assignedUserId;
  const rows = await db
    .select({
      membershipId: storeMemberships.id,
      membershipStatus: storeMemberships.status,
      overrideAllowed: membershipPermissionOverrides.allowed,
      overridePermission: membershipPermissionOverrides.permissionKey,
      preferenceEnabled: crmPushPreferences.enabled,
      role: roleTemplates.roleKey,
      subscriptionEnabled: crmPushSubscriptions.enabled,
      subscriptionId: crmPushSubscriptions.subscriptionId,
      userDeleted: users.isDeleted,
      userId: storeMemberships.userId,
    })
    .from(storeMemberships)
    .innerJoin(
      roleTemplates,
      eq(roleTemplates.id, storeMemberships.roleTemplateId),
    )
    .innerJoin(users, eq(users.id, storeMemberships.userId))
    .leftJoin(
      membershipPermissionOverrides,
      eq(membershipPermissionOverrides.membershipId, storeMemberships.id),
    )
    .leftJoin(
      crmPushPreferences,
      and(
        eq(crmPushPreferences.tenantId, storeMemberships.tenantId),
        eq(crmPushPreferences.storeId, storeMemberships.storeId),
        eq(crmPushPreferences.userId, storeMemberships.userId),
      ),
    )
    .leftJoin(
      crmPushSubscriptions,
      eq(crmPushSubscriptions.userId, storeMemberships.userId),
    )
    .where(
      and(
        eq(storeMemberships.tenantId, input.tenantId),
        eq(storeMemberships.storeId, input.storeId),
      ),
    );
  return groupRecipientCandidates(rows);
}

export function groupRecipientCandidates(
  rows: readonly RecipientRow[],
): readonly CrmPushRecipientCandidate[] {
  const grouped = new Map<string, RecipientRow[]>();
  for (const row of rows) {
    const current = grouped.get(row.membershipId) ?? [];
    current.push(row);
    grouped.set(row.membershipId, current);
  }
  return [...grouped.values()].map(toCandidate);
}

function toCandidate(
  membershipRows: RecipientRow[],
): CrmPushRecipientCandidate {
  const first = membershipRows[0]!;
  const overrides = new Map<string, boolean>();
  for (const row of membershipRows) {
    if (row.overridePermission !== null && row.overrideAllowed !== null) {
      overrides.set(row.overridePermission, row.overrideAllowed);
    }
  }
  const permissions = resolvePermissions({
    overrides: [...overrides].map(([permission, allowed]) => ({
      allowed,
      permission: permission as PermissionKey,
    })),
    role: first.role,
  });
  return {
    activeMembership: first.membershipStatus === "active" && !first.userDeleted,
    canReadConversations: permissions.includes("crm.conversations.read"),
    hasGlobalQueueVisibility:
      permissions.includes("crm.conversations.assign") ||
      permissions.includes("crm.conversations.read_unassigned"),
    preferenceEnabled: first.preferenceEnabled ?? true,
    subscriptionIds: [
      ...new Set(
        membershipRows.flatMap((row) =>
          row.subscriptionEnabled && row.subscriptionId
            ? [row.subscriptionId]
            : [],
        ),
      ),
    ],
    userId: first.userId,
  };
}
