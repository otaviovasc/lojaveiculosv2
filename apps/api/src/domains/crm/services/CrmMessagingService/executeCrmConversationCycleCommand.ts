import { createHash } from "node:crypto";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  CrmConversationCycleCommandResult,
  CrmConversationCycleCommandType,
} from "../../ports/crmConversationCycleCommandRepository.js";
import type { CrmConversationCycle } from "../../ports/crmConversationRepository.js";
import { ConversationCycleCommandConflictError } from "../../messaging/crmMessagingErrors.js";
import {
  getCrmConversationRepository,
  getCrmConversationCycleCommandRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  findScopedConversationCycle,
  sessionWithConnection,
} from "./conversationCycleMutationSupport.js";
export type ConversationCycleCommandResponse = {
  result: CrmConversationCycleCommandResult;
  conversationCycle: CrmConversationCycle;
};

type CommandMutation = {
  result: CrmConversationCycleCommandResult;
  conversationCycle: CrmConversationCycle;
};

export async function executeCrmConversationCycleCommand(input: {
  commandId: string;
  commandType: CrmConversationCycleCommandType;
  context: ServiceContext;
  fingerprintInput: Record<string, unknown>;
  includeDeleted?: boolean;
  mutate: (
    current: CrmConversationCycle,
    ports: CrmServicePorts,
    scope: { storeId: StoreId; tenantId: TenantId },
  ) => Promise<CommandMutation>;
  ports: CrmServicePorts;
  cycleId: string;
}): Promise<ConversationCycleCommandResponse & { changed: boolean }> {
  const lookupOptions = {
    includeArchived: true,
    includeDeleted: input.includeDeleted === true,
  };
  const requestFingerprint = fingerprint(input.fingerprintInput);
  const command = await runCrmTransaction(input.ports, async (ports) => {
    const { scope, conversationCycle } = await findScopedConversationCycle(
      input.context,
      { cycleId: input.cycleId },
      ports,
      lookupOptions,
    );
    const repository = getCrmConversationCycleCommandRepository(ports);
    const claimed = await repository.claim({
      commandId: input.commandId,
      commandType: input.commandType,
      requestFingerprint,
      cycleId: input.cycleId,
      storeId: scope.storeId as StoreId,
      tenantId: scope.tenantId as TenantId,
    });
    if (claimed.status === "existing") {
      assertSameCommand(claimed.receipt, {
        commandType: input.commandType,
        requestFingerprint,
        cycleId: input.cycleId,
      });
      if (!claimed.receipt.result) {
        throw new ConversationCycleCommandConflictError(
          input.commandId,
          "is still being processed",
        );
      }
      return {
        changed: false,
        result:
          claimed.receipt.result === "applied"
            ? ("already_applied" as const)
            : claimed.receipt.result,
        conversationCycle: await reloadVisibleConversationCycle(
          input.context,
          ports,
          input.cycleId,
          lookupOptions,
        ),
      };
    }

    const mutation = await input.mutate(conversationCycle, ports, {
      storeId: scope.storeId as StoreId,
      tenantId: scope.tenantId as TenantId,
    });
    await repository.complete({
      commandId: input.commandId,
      result: mutation.result,
      cycleRevision: mutation.conversationCycle.revision,
      storeId: scope.storeId as StoreId,
      tenantId: scope.tenantId as TenantId,
    });
    return {
      changed: mutation.result === "applied",
      ...mutation,
    };
  });
  return {
    changed: command.changed,
    result: command.result,
    conversationCycle: await sessionWithConnection(
      command.conversationCycle,
      input.ports,
      input.cycleId,
    ),
  };
}

export async function reloadScopedConversationCycle(
  ports: CrmServicePorts,
  cycleId: string,
  scope: { storeId: string; tenantId: string },
) {
  const [conversationCycle] = await getCrmConversationRepository(
    ports,
  ).listConversationCycles({
    limit: 1,
    offset: 0,
    cycleId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!conversationCycle)
    throw new Error("CRM WhatsApp conversationCycle disappeared.");
  return conversationCycle;
}

export async function reloadVisibleConversationCycle(
  context: ServiceContext,
  ports: CrmServicePorts,
  cycleId: string,
  options: { includeArchived?: boolean; includeDeleted?: boolean } = {},
) {
  return (
    await findScopedConversationCycle(context, { cycleId }, ports, options)
  ).conversationCycle;
}

function fingerprint(input: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function sessionCommandIdFromKey(key: string) {
  const hex = createHash("sha256").update(key).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function assertSameCommand(
  receipt: {
    commandType: CrmConversationCycleCommandType;
    requestFingerprint: string;
    cycleId: string;
  },
  input: {
    commandType: CrmConversationCycleCommandType;
    requestFingerprint: string;
    cycleId: string;
  },
) {
  if (
    receipt.commandType === input.commandType &&
    receipt.requestFingerprint === input.requestFingerprint &&
    receipt.cycleId === input.cycleId
  ) {
    return;
  }
  throw new ConversationCycleCommandConflictError(
    "unknown",
    "was reused for a different request",
  );
}
