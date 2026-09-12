import { useEffect, useState } from "react";
import { createSettingsApi } from "../settings/apiClient";
import { createSettingsApiOptions } from "../settings/runtimeApi";
import type { ProductCrmLead } from "./productCrmTypes";

type RoleManagement = Awaited<
  ReturnType<ReturnType<typeof createSettingsApi>["getRoleManagement"]>
>;

let roleManagementPromise: Promise<RoleManagement> | null = null;

function loadRoleManagement() {
  roleManagementPromise ??= createSettingsApiOptions()
    .then((options) => createSettingsApi(options).getRoleManagement())
    .catch((error: unknown) => {
      roleManagementPromise = null;
      throw error;
    });
  return roleManagementPromise;
}

/**
 * Resolves the lead owner display name from the store role memberships.
 * Returns `undefined` while loading, `null` when the lead has no owner,
 * and the member name (or email) once resolved.
 */
export function useCrmLeadOwnerName(
  lead: Pick<ProductCrmLead, "assignedUserId" | "id">,
) {
  const assignedUserId = lead.assignedUserId ?? null;
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [isResolved, setIsResolved] = useState(!assignedUserId);

  useEffect(() => {
    if (!assignedUserId) {
      setOwnerName(null);
      setIsResolved(true);
      return;
    }
    let active = true;
    setIsResolved(false);
    void loadRoleManagement()
      .then((roles) => {
        if (!active) return;
        const member = roles.memberships.find(
          (item) => String(item.user.id) === String(assignedUserId),
        );
        setOwnerName(member ? (member.user.name ?? member.user.email) : null);
        setIsResolved(true);
      })
      .catch(() => {
        if (!active) return;
        setOwnerName(null);
        setIsResolved(true);
      });
    return () => {
      active = false;
    };
  }, [assignedUserId, lead.id]);

  if (!assignedUserId) return null;
  return isResolved ? ownerName : undefined;
}
