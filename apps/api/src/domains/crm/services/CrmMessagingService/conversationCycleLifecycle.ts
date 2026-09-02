import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmConversationCycle,
  UpdateCrmConversationCycleInput,
} from "../../ports/crmConversationRepository.js";
import {
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  executeCrmConversationCycleCommand,
  reloadVisibleConversationCycle,
  type ConversationCycleCommandResponse,
} from "./executeCrmConversationCycleCommand.js";
import {
  logCrmServiceEvent,
  publishConversationCycleUpdate,
  recordCrmServiceMutation,
} from "./serviceSupport.js";

export type ConversationCycleLifecycleInput = {
  commandId: string;
  cycleId: string;
};

const permission = "crm.conversations.manage";

type LifecycleFlag = "archivedAt" | "deletedAt" | "pinnedAt";

const lifecycleMeta: Record<
  LifecycleFlag,
  { action: string; commandType: "archive" | "delete" | "pin"; summary: string }
> = {
  archivedAt: {
    action: "crm.conversation_cycle.archive",
    commandType: "archive",
    summary: "Toggled CRM conversationCycle archive state",
  },
  deletedAt: {
    action: "crm.conversation_cycle.delete",
    commandType: "delete",
    summary: "Soft deleted CRM conversationCycle",
  },
  pinnedAt: {
    action: "crm.conversation_cycle.pin",
    commandType: "pin",
    summary: "Toggled CRM conversationCycle pin state",
  },
};

export async function archiveConversationCycle(
  context: ServiceContext,
  input: ConversationCycleLifecycleInput,
  ports: CrmServicePorts,
): Promise<ConversationCycleCommandResponse> {
  return runLifecycleCommand(context, input, ports, "archivedAt", true);
}

export async function pinConversationCycle(
  context: ServiceContext,
  input: ConversationCycleLifecycleInput,
  ports: CrmServicePorts,
): Promise<ConversationCycleCommandResponse> {
  return runLifecycleCommand(context, input, ports, "pinnedAt", true);
}

export async function deleteConversationCycle(
  context: ServiceContext,
  input: ConversationCycleLifecycleInput,
  ports: CrmServicePorts,
): Promise<ConversationCycleCommandResponse> {
  return runLifecycleCommand(context, input, ports, "deletedAt", false);
}

async function runLifecycleCommand(
  context: ServiceContext,
  input: ConversationCycleLifecycleInput,
  ports: CrmServicePorts,
  flag: LifecycleFlag,
  toggle: boolean,
): Promise<ConversationCycleCommandResponse> {
  assertPermission(context, permission);
  const meta = lifecycleMeta[flag];
  logCrmServiceEvent(context, `${meta.action}.started`, {
    commandId: input.commandId,
    cycleId: input.cycleId,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: meta.action,
      category: "data_change",
      entityId: input.cycleId,
      entityType: "crm_conversation_cycle",
      metadata: { commandId: input.commandId },
      permission,
      summary: meta.summary,
    },
    async () => {
      // Only the delete command (soft delete + replay) may resolve deleted
      // cycles; archive/pin on a deleted cycle must not find it (404).
      const includeDeleted = flag === "deletedAt";
      const command = await executeCrmConversationCycleCommand({
        commandId: input.commandId,
        commandType: meta.commandType,
        context,
        fingerprintInput: { [flag]: true },
        includeDeleted,
        mutate: async (current, transactionPorts, scope) => {
          const nextValue = nextFlagValue(current, flag, toggle);
          if (nextValue === undefined) {
            return { result: "already_applied", conversationCycle: current };
          }
          let candidate = current;
          for (let attempt = 0; attempt < 3; attempt += 1) {
            const update: UpdateCrmConversationCycleInput = {
              expectedRevision: candidate.revision,
              cycleId: input.cycleId,
              storeId: scope.storeId,
              tenantId: scope.tenantId,
            };
            update[flag] = nextValue;
            const updated =
              await getCrmConversationRepository(
                transactionPorts,
              ).updateConversationCycle(update);
            if (updated)
              return { result: "applied", conversationCycle: updated };
            candidate = await reloadVisibleConversationCycle(
              context,
              transactionPorts,
              input.cycleId,
              { includeArchived: true, includeDeleted },
            );
            const retryValue = nextFlagValue(candidate, flag, toggle);
            if (retryValue === undefined) {
              return {
                result: "already_applied",
                conversationCycle: candidate,
              };
            }
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

function nextFlagValue(
  current: CrmConversationCycle,
  flag: LifecycleFlag,
  toggle: boolean,
): Date | null | undefined {
  const existing = current[flag];
  if (!toggle) return existing ? undefined : new Date();
  return existing ? null : new Date();
}
