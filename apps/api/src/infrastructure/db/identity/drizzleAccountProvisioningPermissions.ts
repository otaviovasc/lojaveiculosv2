import { and, eq } from "drizzle-orm";
import {
  membershipPermissionOverrides,
  roleTemplates,
  tenantMemberships,
} from "@lojaveiculosv2/db";
import type { PermissionKey, RoleKey } from "@lojaveiculosv2/shared";
import { resolvePermissions } from "../../../domains/identity/domain/permissionResolver.js";
import type { DrizzleAccountProvisioningClient } from "./drizzleAccountProvisioningSupport.js";

export async function resolveMembershipPermissions(
  db: DrizzleAccountProvisioningClient,
  membership: {
    billingManagedBy?: "agency" | "store_owner";
    membershipId: string;
    role: RoleKey;
  },
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
  const permissions = resolvePermissions({
    overrides: overrides.map((override) => ({
      allowed: override.allowed,
      permission: override.permission as PermissionKey,
    })),
    role: membership.role,
  });
  return applyBillingAuthorityPermissionRules(permissions, membership);
}

export function resolveRolePermissions(input: {
  billingManagedBy?: "agency" | "store_owner";
  role: RoleKey;
}) {
  return applyBillingAuthorityPermissionRules(
    resolvePermissions({ role: input.role }),
    input,
  );
}

export async function hasActiveAgencyTenantMembership(
  db: DrizzleAccountProvisioningClient,
  tenantId: string,
) {
  const [row] = await db
    .select({ id: tenantMemberships.id })
    .from(tenantMemberships)
    .innerJoin(
      roleTemplates,
      eq(roleTemplates.id, tenantMemberships.roleTemplateId),
    )
    .where(
      and(
        eq(tenantMemberships.tenantId, tenantId),
        eq(tenantMemberships.status, "active"),
        eq(roleTemplates.roleKey, "agency"),
      ),
    )
    .limit(1);
  return Boolean(row);
}

function applyBillingAuthorityPermissionRules(
  permissions: readonly PermissionKey[],
  input: { billingManagedBy?: "agency" | "store_owner"; role: RoleKey },
) {
  if (input.billingManagedBy !== "agency" || input.role === "agency") {
    return [...permissions];
  }

  return permissions.filter((permission) => permission !== "billing.manage");
}
