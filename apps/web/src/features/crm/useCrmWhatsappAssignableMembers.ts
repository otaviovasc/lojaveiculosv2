import { useEffect, useMemo, useState } from "react";
import type { SessionBootstrap } from "../account/apiClient";
import { createSettingsApi } from "../settings/apiClient";
import { createSettingsApiOptions } from "../settings/runtimeApi";
import type { RoleManagementView, RoleMemberView } from "../settings/types";
import type { CrmWhatsappAssignableMember } from "./crmWhatsappTypes";
import {
  hasWhatsappPermission,
  hasWhatsappQueueAccess,
} from "./crmWhatsappPermissions";

export function useCrmWhatsappAssignableMembers(
  session: SessionBootstrap | null,
) {
  const [assignableMembers, setAssignableMembers] = useState<
    CrmWhatsappAssignableMember[]
  >(() => (session ? [currentUserAssignableMember(session)] : []));
  const canAssignSessions = useMemo(
    () => canAssignWhatsappSessions(session),
    [session],
  );

  useEffect(() => {
    if (!session) {
      setAssignableMembers([]);
      return;
    }
    let active = true;
    void createSettingsApiOptions()
      .then((options) => createSettingsApi(options).getRoleManagement())
      .then((roles) => {
        if (active)
          setAssignableMembers(
            mapRoleManagementToWhatsappAssignableMembers(roles, session),
          );
      })
      .catch(() => {
        if (active)
          setAssignableMembers([currentUserAssignableMember(session)]);
      });
    return () => {
      active = false;
    };
  }, [session]);

  return { assignableMembers, canAssignSessions };
}

export function canAssignWhatsappSessions(session: SessionBootstrap | null) {
  return hasWhatsappPermission(session, "crm.whatsapp.assign");
}

export function mapRoleManagementToWhatsappAssignableMembers(
  roles: RoleManagementView,
  session: SessionBootstrap,
): CrmWhatsappAssignableMember[] {
  const assignableMembers = roles.memberships
    .filter((member) => member.status === "active")
    .filter((member) => hasWhatsappAccess(member))
    .map(toWhatsappAssignableMember);
  return assignableMembers.length
    ? assignableMembers
    : [currentUserAssignableMember(session)];
}

function hasWhatsappAccess(member: RoleMemberView) {
  return hasWhatsappQueueAccess(member.effectivePermissions);
}

function toWhatsappAssignableMember(
  member: RoleMemberView,
): CrmWhatsappAssignableMember {
  return {
    email: member.user.email,
    id: member.user.id as never,
    isActive: true,
    name: member.user.name ?? member.user.email,
    role: member.role.toUpperCase(),
    seeUnassignedChats:
      member.effectivePermissions.includes("crm.whatsapp.list") ||
      member.effectivePermissions.includes("crm.whatsapp.assign"),
  };
}

function currentUserAssignableMember(
  session: SessionBootstrap,
): CrmWhatsappAssignableMember {
  return {
    email: session.user.email,
    id: session.user.id as never,
    isActive: true,
    name: session.user.name ?? session.user.email,
    role: session.defaultStore?.role?.toUpperCase() ?? "MEMBER",
    seeUnassignedChats: canAssignWhatsappSessions(session),
  };
}
