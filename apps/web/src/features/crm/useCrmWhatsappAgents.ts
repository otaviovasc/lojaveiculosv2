import { useEffect, useMemo, useState } from "react";
import type { SessionBootstrap } from "../account/apiClient";
import { createSettingsApi } from "../settings/apiClient";
import { createSettingsApiOptions } from "../settings/runtimeApi";
import type { RoleManagementView, RoleMemberView } from "../settings/types";
import type { CrmWhatsappAgent } from "./crmWhatsappTypes";
import {
  hasWhatsappPermission,
  hasWhatsappQueueAccess,
} from "./crmWhatsappPermissions";

export function useCrmWhatsappAgents(session: SessionBootstrap | null) {
  const [agents, setAgents] = useState<CrmWhatsappAgent[]>(() =>
    session ? [currentUserAgent(session)] : [],
  );
  const canAssignSessions = useMemo(
    () => canAssignWhatsappSessions(session),
    [session],
  );

  useEffect(() => {
    if (!session) {
      setAgents([]);
      return;
    }
    let active = true;
    void createSettingsApiOptions()
      .then((options) => createSettingsApi(options).getRoleManagement())
      .then((roles) => {
        if (active)
          setAgents(mapRoleManagementToWhatsappAgents(roles, session));
      })
      .catch(() => {
        if (active) setAgents([currentUserAgent(session)]);
      });
    return () => {
      active = false;
    };
  }, [session]);

  return { agents, canAssignSessions };
}

export function canAssignWhatsappSessions(session: SessionBootstrap | null) {
  return hasWhatsappPermission(session, "crm.whatsapp.assign");
}

export function mapRoleManagementToWhatsappAgents(
  roles: RoleManagementView,
  session: SessionBootstrap,
): CrmWhatsappAgent[] {
  const agents = roles.memberships
    .filter((member) => member.status === "active")
    .filter((member) => hasWhatsappAccess(member))
    .map(toWhatsappAgent);
  return agents.length ? agents : [currentUserAgent(session)];
}

function hasWhatsappAccess(member: RoleMemberView) {
  return hasWhatsappQueueAccess(member.effectivePermissions);
}

function toWhatsappAgent(member: RoleMemberView): CrmWhatsappAgent {
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

function currentUserAgent(session: SessionBootstrap): CrmWhatsappAgent {
  return {
    email: session.user.email,
    id: session.user.id as never,
    isActive: true,
    name: session.user.name ?? session.user.email,
    role: session.defaultStore?.role?.toUpperCase() ?? "AGENT",
    seeUnassignedChats: canAssignWhatsappSessions(session),
  };
}
