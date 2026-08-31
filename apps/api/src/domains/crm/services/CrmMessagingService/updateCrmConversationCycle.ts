import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { type CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  publishConversationCycleUpdate,
  recordCrmServiceMutation,
} from "./serviceSupport.js";
import {
  executeCrmConversationCycleCommand,
  type ConversationCycleCommandResponse,
} from "./executeCrmConversationCycleCommand.js";
import { applyConversationCycleAssignment } from "../../messaging/conversationCycleAssignment.js";
import { interventionActorKind } from "../../messaging/humanAttendanceTransition.js";
export {
  setConversationAttendance,
  type SetConversationAttendanceInput,
} from "./setConversationAttendance.js";
export {
  closeConversationCycle,
  type CloseConversationCycleInput,
} from "./closeConversationCycle.js";

export type AssignConversationCycleInput = {
  assignedUserId: string | null;
  commandId: string;
  cycleId: string;
};

const assignPermission = "crm.conversations.assign";

export async function assignConversationCycle(
  context: ServiceContext,
  input: AssignConversationCycleInput,
  ports: CrmServicePorts,
): Promise<ConversationCycleCommandResponse> {
  assertPermission(context, assignPermission);
  const managerReassignment = context.permissions.includes(
    "crm.pipeline.manage",
  );
  if (input.assignedUserId !== context.actor.id && !managerReassignment) {
    assertPermission(context, "crm.pipeline.manage");
  }
  logCrmServiceEvent(context, "crm.conversation_cycle.assign.started", {
    assignedUserId: input.assignedUserId,
    commandId: input.commandId,
    cycleId: input.cycleId,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.conversation_cycle.assign",
      category: "data_change",
      entityId: input.cycleId,
      entityType: "crm_conversation_cycle",
      metadata: {
        assignedUserId: input.assignedUserId,
        commandId: input.commandId,
      },
      permission: assignPermission,
      summary: "Assigned CRM WhatsApp conversationCycle",
    },
    async () => {
      let revokedUserId: string | undefined;
      const command = await executeCrmConversationCycleCommand({
        commandId: input.commandId,
        commandType: "assign",
        context,
        fingerprintInput: { assignedUserId: input.assignedUserId },
        mutate: async (current, transactionPorts, scope) => {
          const assignment = await applyConversationCycleAssignment({
            actorId: context.actor.id,
            actorKind: interventionActorKind(
              context.actor.kind,
              "crm_assignment",
            ),
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
        cycleId: input.cycleId,
      });
      if (command.changed) {
        await publishConversationCycleUpdate(
          ports,
          command.conversationCycle,
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
