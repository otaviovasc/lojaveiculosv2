import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  publishConversationCycleUpdate,
  recordCrmServiceMutation,
} from "./serviceSupport.js";
import {
  executeCrmConversationCycleCommand,
  reloadVisibleConversationCycle,
  type ConversationCycleCommandResponse,
} from "./executeCrmConversationCycleCommand.js";

export type MarkConversationCycleReadInput = {
  commandId: string;
  cycleId: string;
  unread: boolean;
};

const permission = "crm.conversations.read";

export async function markConversationCycleReadState(
  context: ServiceContext,
  input: MarkConversationCycleReadInput,
  ports: CrmServicePorts,
): Promise<ConversationCycleCommandResponse> {
  assertPermission(context, permission);
  const action = input.unread
    ? "crm.conversation_cycle.mark_unread"
    : "crm.conversation_cycle.mark_read";
  logCrmServiceEvent(context, `${action}.started`, {
    commandId: input.commandId,
    cycleId: input.cycleId,
  });
  return recordCrmServiceMutation(
    context,
    {
      action,
      category: "data_change",
      entityId: input.cycleId,
      entityType: "crm_conversation_cycle",
      metadata: { commandId: input.commandId },
      permission,
      summary: input.unread
        ? "Marked CRM WhatsApp conversationCycle unread"
        : "Marked CRM WhatsApp conversationCycle read",
    },
    async () => {
      const command = await executeCrmConversationCycleCommand({
        commandId: input.commandId,
        commandType: input.unread ? "mark_unread" : "mark_read",
        context,
        fingerprintInput: { unread: input.unread },
        mutate: async (current, transactionPorts, scope) => {
          if (
            input.unread
              ? current.lastReadAt === null
              : current.unreadCount === 0
          ) {
            return { result: "already_applied", conversationCycle: current };
          }
          let candidate = current;
          for (let attempt = 0; attempt < 3; attempt += 1) {
            const updated = await getCrmConversationRepository(
              transactionPorts,
            ).updateConversationCycle({
              incrementPushNotificationGeneration: true,
              lastReadAt: input.unread ? null : new Date(),
              expectedRevision: candidate.revision,
              cycleId: input.cycleId,
              storeId: scope.storeId,
              tenantId: scope.tenantId,
            });
            if (updated)
              return { result: "applied", conversationCycle: updated };
            const reloaded = await reloadVisibleConversationCycle(
              context,
              transactionPorts,
              input.cycleId,
            );
            if (
              input.unread
                ? reloaded.lastReadAt === null
                : reloaded.unreadCount === 0
            ) {
              return { result: "already_applied", conversationCycle: reloaded };
            }
            candidate = reloaded;
          }
          return { result: "superseded", conversationCycle: candidate };
        },
        ports,
        cycleId: input.cycleId,
      });
      if (command.changed) {
        await publishConversationCycleUpdate(ports, command.conversationCycle, {
          storeId: context.storeId!,
          tenantId: context.tenantId!,
        });
      }
      return command;
    },
    (result) => ({ result: result.result }),
  );
}
