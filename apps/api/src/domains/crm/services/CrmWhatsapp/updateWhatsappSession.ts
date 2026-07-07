import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmRepository,
  getCrmWhatsappRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type { WhatsappSession } from "../../whatsapp/whatsappModels.js";
import {
  logWhatsappServiceEvent,
  publishWhatsappSessionUpdate,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import { closeLinkedWhatsappLead } from "../../whatsapp/updateWhatsappLinkedLead.js";
import {
  findScopedWhatsappSession,
  sessionWithConnection,
} from "./whatsappSessionMutationSupport.js";
export {
  toggleWhatsappIntervention,
  type ToggleWhatsappInterventionInput,
} from "./toggleWhatsappIntervention.js";

export type AssignWhatsappSessionInput = {
  assignedUserId: string | null;
  sessionId: string;
};

export type CloseWhatsappSessionInput = {
  sessionId: string;
};

const assignPermission = "crm.whatsapp.assign";
const closePermission = "crm.whatsapp.close";

export async function assignWhatsappSession(
  context: ServiceContext,
  input: AssignWhatsappSessionInput,
  ports: CrmServicePorts,
): Promise<WhatsappSession> {
  assertPermission(context, assignPermission);
  logWhatsappServiceEvent(context, "crm.whatsapp.session.assign.started", {
    assignedUserId: input.assignedUserId,
    sessionId: input.sessionId,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.session.assign",
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      metadata: { assignedUserId: input.assignedUserId },
      permission: assignPermission,
      summary: "Assigned CRM WhatsApp session",
    },
    () => assignWhatsappSessionUnchecked(context, input, ports),
  );
}

async function assignWhatsappSessionUnchecked(
  context: ServiceContext,
  input: AssignWhatsappSessionInput,
  ports: CrmServicePorts,
) {
  const { scope, session } = await findScopedWhatsappSession(
    context,
    input,
    ports,
  );
  const now = new Date();
  const updated = await getCrmWhatsappRepository(ports).updateSession({
    assignedUserId: input.assignedUserId as never,
    ...(input.assignedUserId
      ? {
          firstHandledAt: session.firstHandledAt ?? now,
          lastAssignedAt: now,
        }
      : {}),
    sessionId: input.sessionId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (session.leadId) {
    await getCrmRepository(ports).updateLead({
      assignedUserId: input.assignedUserId as never,
      leadId: session.leadId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
  }

  const realtimeSession = await sessionWithConnection(
    updated,
    ports,
    input.sessionId,
  );
  await publishWhatsappSessionUpdate(ports, realtimeSession, scope);
  return realtimeSession;
}

export async function closeWhatsappSession(
  context: ServiceContext,
  input: CloseWhatsappSessionInput,
  ports: CrmServicePorts,
): Promise<WhatsappSession> {
  assertPermission(context, closePermission);
  logWhatsappServiceEvent(context, "crm.whatsapp.session.close.started", {
    sessionId: input.sessionId,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.session.close",
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      permission: closePermission,
      summary: "Closed CRM WhatsApp session",
    },
    () => closeWhatsappSessionUnchecked(context, input, ports),
  );
}

async function closeWhatsappSessionUnchecked(
  context: ServiceContext,
  input: CloseWhatsappSessionInput,
  ports: CrmServicePorts,
) {
  const { scope, session } = await findScopedWhatsappSession(
    context,
    input,
    ports,
  );
  const now = new Date();
  const updated = await getCrmWhatsappRepository(ports).updateSession({
    assignedUserId: null,
    firstHandledAt: session.firstHandledAt ?? now,
    metadata: {
      ...session.metadata,
      lastClosedAt: now.toISOString(),
      lastClosedByActorId: context.actor.id,
    },
    sessionId: input.sessionId,
    status: "COMPLETED",
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  if (session.leadId) {
    await closeLinkedWhatsappLead(context, session.leadId, ports);
  }

  const realtimeSession = await sessionWithConnection(
    updated,
    ports,
    input.sessionId,
  );
  await publishWhatsappSessionUpdate(ports, realtimeSession, scope);
  return realtimeSession;
}
