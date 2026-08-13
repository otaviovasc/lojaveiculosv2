import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
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

export type MarkWhatsappSessionReadInput = {
  commandId: string;
  sessionId: string;
  unread: boolean;
};

const permission = "crm.whatsapp.read";

export async function markWhatsappSessionReadState(
  context: ServiceContext,
  input: MarkWhatsappSessionReadInput,
  ports: CrmServicePorts,
): Promise<WhatsappSessionCommandResponse> {
  assertPermission(context, permission);
  const action = input.unread
    ? "crm.whatsapp.session.mark_unread"
    : "crm.whatsapp.session.mark_read";
  logWhatsappServiceEvent(context, `${action}.started`, {
    commandId: input.commandId,
    sessionId: input.sessionId,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action,
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      metadata: { commandId: input.commandId },
      permission,
      summary: input.unread
        ? "Marked CRM WhatsApp session unread"
        : "Marked CRM WhatsApp session read",
    },
    async () => {
      const command = await executeWhatsappSessionCommand({
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
            return { result: "already_applied", session: current };
          }
          let candidate = current;
          for (let attempt = 0; attempt < 3; attempt += 1) {
            const updated = await getCrmWhatsappRepository(
              transactionPorts,
            ).updateSession({
              lastReadAt: input.unread ? null : new Date(),
              expectedRevision: candidate.revision,
              sessionId: input.sessionId,
              storeId: scope.storeId,
              tenantId: scope.tenantId,
            });
            if (updated) return { result: "applied", session: updated };
            const reloaded = await reloadScopedWhatsappSession(
              transactionPorts,
              input.sessionId,
              scope,
            );
            if (
              input.unread
                ? reloaded.lastReadAt === null
                : reloaded.unreadCount === 0
            ) {
              return { result: "already_applied", session: reloaded };
            }
            candidate = reloaded;
          }
          return { result: "superseded", session: candidate };
        },
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
