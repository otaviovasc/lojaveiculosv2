import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmRepository,
  getCrmWhatsappRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  publishWhatsappSessionUpdate,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  executeWhatsappSessionCommand,
  reloadScopedWhatsappSession,
  type WhatsappSessionCommandResponse,
} from "./executeWhatsappSessionCommand.js";
import type { CrmWhatsappSession } from "../../ports/crmWhatsappRepository.js";
export {
  toggleWhatsappIntervention,
  type ToggleWhatsappInterventionInput,
} from "./toggleWhatsappIntervention.js";
export {
  closeWhatsappSession,
  type CloseWhatsappSessionInput,
} from "./closeWhatsappSession.js";

export type AssignWhatsappSessionInput = {
  assignedUserId: string | null;
  commandId: string;
  sessionId: string;
};

const assignPermission = "crm.whatsapp.assign";

export async function assignWhatsappSession(
  context: ServiceContext,
  input: AssignWhatsappSessionInput,
  ports: CrmServicePorts,
): Promise<WhatsappSessionCommandResponse> {
  assertPermission(context, assignPermission);
  const managerReassignment = context.permissions.includes(
    "crm.pipeline.manage",
  );
  if (input.assignedUserId !== context.actor.id && !managerReassignment) {
    assertPermission(context, "crm.pipeline.manage");
  }
  logWhatsappServiceEvent(context, "crm.whatsapp.session.assign.started", {
    assignedUserId: input.assignedUserId,
    commandId: input.commandId,
    sessionId: input.sessionId,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.session.assign",
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      metadata: {
        assignedUserId: input.assignedUserId,
        commandId: input.commandId,
      },
      permission: assignPermission,
      summary: "Assigned CRM WhatsApp session",
    },
    async () => {
      const command = await executeWhatsappSessionCommand({
        commandId: input.commandId,
        commandType: "assign",
        context,
        fingerprintInput: { assignedUserId: input.assignedUserId },
        mutate: (current, transactionPorts, scope) =>
          applyAssignment(context, input, current, transactionPorts, scope),
        ports,
        sessionId: input.sessionId,
      });
      if (command.changed) {
        await publishWhatsappSessionUpdate(ports, command.session, {
          storeId: context.storeId!,
          tenantId: context.tenantId!,
        });
      }
      return command;
    },
    (result) => ({ result: result.result }),
  );
}

async function applyAssignment(
  context: ServiceContext,
  input: AssignWhatsappSessionInput,
  initial: CrmWhatsappSession,
  ports: CrmServicePorts,
  scope: { storeId: string; tenantId: string },
) {
  let current = initial;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (current.assignedUserId === input.assignedUserId) {
      return { result: "already_applied" as const, session: current };
    }
    const selfClaim = input.assignedUserId === context.actor.id;
    if (
      selfClaim &&
      current.assignedUserId !== null &&
      !context.permissions.includes("crm.pipeline.manage")
    ) {
      return { result: "superseded" as const, session: current };
    }
    const now = new Date();
    const updated = await getCrmWhatsappRepository(ports).updateSession({
      assignedUserId: input.assignedUserId as never,
      expectedRevision: current.revision,
      ...(input.assignedUserId
        ? {
            firstHandledAt: current.firstHandledAt ?? now,
            lastAssignedAt: now,
          }
        : {}),
      sessionId: input.sessionId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (updated) {
      if (current.leadId) {
        await getCrmRepository(ports).updateLead({
          assignedUserId: input.assignedUserId as never,
          leadId: current.leadId,
          storeId: scope.storeId as never,
          tenantId: scope.tenantId as never,
        });
      }
      return { result: "applied" as const, session: updated };
    }
    current = await reloadScopedWhatsappSession(ports, input.sessionId, scope);
  }
  return { result: "superseded" as const, session: current };
}
