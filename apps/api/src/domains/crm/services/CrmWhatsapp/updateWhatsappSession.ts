import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { type CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  publishWhatsappSessionUpdate,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  executeWhatsappSessionCommand,
  type WhatsappSessionCommandResponse,
} from "./executeWhatsappSessionCommand.js";
import { applyWhatsappSessionAssignment } from "../../whatsapp/whatsappSessionAssignment.js";
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
      let revokedUserId: string | undefined;
      const command = await executeWhatsappSessionCommand({
        commandId: input.commandId,
        commandType: "assign",
        context,
        fingerprintInput: { assignedUserId: input.assignedUserId },
        mutate: async (current, transactionPorts, scope) => {
          const assignment = await applyWhatsappSessionAssignment({
            allowReassignment: context.permissions.includes(
              "crm.pipeline.manage",
            ),
            assignedAt: new Date(),
            assignedUserId: input.assignedUserId,
            initialSession: current,
            ports: transactionPorts,
            scope,
          });
          revokedUserId = assignment.previousAssignedUserId;
          return assignment;
        },
        ports,
        sessionId: input.sessionId,
      });
      if (command.changed) {
        await publishWhatsappSessionUpdate(
          ports,
          command.session,
          {
            storeId: context.storeId!,
            tenantId: context.tenantId!,
          },
          revokedUserId ? { revokedUserId } : {},
        );
      }
      return command;
    },
    (result) => ({ result: result.result }),
  );
}
