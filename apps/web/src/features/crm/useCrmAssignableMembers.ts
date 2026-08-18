import { useEffect, useMemo, useState } from "react";
import type { SessionBootstrap } from "../account/apiClient";
import { createSettingsApi } from "../settings/apiClient";
import { createSettingsApiOptions } from "../settings/runtimeApi";
import type { RoleManagementView, RoleMemberView } from "../settings/types";
import type { CrmAssignableMember } from "./crmConversationTypes";
import { hasCrmPermission, hasCrmConversationAccess } from "./crmPermissions";

export function useCrmAssignableMembers(cycle: SessionBootstrap | null) {
  const [assignableMembers, setAssignableMembers] = useState<
    CrmAssignableMember[]
  >(() => (cycle ? [currentUserAssignableMember(cycle)] : []));
  const canAssignSessions = useMemo(
    () => canAssignConversationCycles(cycle),
    [cycle],
  );

  useEffect(() => {
    if (!cycle) {
      setAssignableMembers([]);
      return;
    }
    let active = true;
    void createSettingsApiOptions()
      .then((options) => createSettingsApi(options).getRoleManagement())
      .then((roles) => {
        if (active)
          setAssignableMembers(
            mapRoleManagementToCrmAssignableMembers(roles, cycle),
          );
      })
      .catch(() => {
        if (active) setAssignableMembers([currentUserAssignableMember(cycle)]);
      });
    return () => {
      active = false;
    };
  }, [cycle]);

  return { assignableMembers, canAssignSessions };
}

export function canAssignConversationCycles(cycle: SessionBootstrap | null) {
  return hasCrmPermission(cycle, "crm.conversations.assign");
}

export function mapRoleManagementToCrmAssignableMembers(
  roles: RoleManagementView,
  cycle: SessionBootstrap,
): CrmAssignableMember[] {
  const assignableMembers = roles.memberships
    .filter((member) => member.status === "active")
    .filter((member) => hasCrmConversationAccessForMember(member))
    .map(toCrmAssignableMember);
  return assignableMembers.length
    ? assignableMembers
    : [currentUserAssignableMember(cycle)];
}

function hasCrmConversationAccessForMember(member: RoleMemberView) {
  return hasCrmConversationAccess(member.effectivePermissions);
}

function toCrmAssignableMember(member: RoleMemberView): CrmAssignableMember {
  return {
    email: member.user.email,
    id: member.user.id as never,
    isActive: true,
    name: member.user.name ?? member.user.email,
    role: member.role.toUpperCase(),
    seeUnassignedChats:
      member.effectivePermissions.includes("crm.conversations.read") ||
      member.effectivePermissions.includes("crm.conversations.assign"),
  };
}

function currentUserAssignableMember(
  cycle: SessionBootstrap,
): CrmAssignableMember {
  return {
    email: cycle.user.email,
    id: cycle.user.id as never,
    isActive: true,
    name: cycle.user.name ?? cycle.user.email,
    role: cycle.defaultStore?.role?.toUpperCase() ?? "MEMBER",
    seeUnassignedChats: canAssignConversationCycles(cycle),
  };
}
