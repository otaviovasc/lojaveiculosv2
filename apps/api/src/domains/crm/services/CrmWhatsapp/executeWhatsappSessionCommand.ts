import { createHash } from "node:crypto";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  CrmWhatsappSessionCommandResult,
  CrmWhatsappSessionCommandType,
} from "../../ports/crmWhatsappSessionCommandRepository.js";
import type { CrmWhatsappSession } from "../../ports/crmWhatsappRepository.js";
import { WhatsappSessionCommandConflictError } from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmWhatsappRepository,
  getCrmWhatsappSessionCommandRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  findScopedWhatsappSession,
  sessionWithConnection,
} from "./whatsappSessionMutationSupport.js";
import type { WhatsappSession } from "../../whatsapp/whatsappModels.js";

export type WhatsappSessionCommandResponse = {
  result: CrmWhatsappSessionCommandResult;
  session: WhatsappSession;
};

type CommandMutation = {
  result: CrmWhatsappSessionCommandResult;
  session: CrmWhatsappSession;
};

export async function executeWhatsappSessionCommand(input: {
  commandId: string;
  commandType: CrmWhatsappSessionCommandType;
  context: ServiceContext;
  fingerprintInput: Record<string, unknown>;
  mutate: (
    current: CrmWhatsappSession,
    ports: CrmServicePorts,
    scope: { storeId: StoreId; tenantId: TenantId },
  ) => Promise<CommandMutation>;
  ports: CrmServicePorts;
  sessionId: string;
}): Promise<WhatsappSessionCommandResponse & { changed: boolean }> {
  const requestFingerprint = fingerprint(input.fingerprintInput);
  const command = await runCrmTransaction(input.ports, async (ports) => {
    const { scope, session } = await findScopedWhatsappSession(
      input.context,
      { sessionId: input.sessionId },
      ports,
    );
    const repository = getCrmWhatsappSessionCommandRepository(ports);
    const claimed = await repository.claim({
      commandId: input.commandId,
      commandType: input.commandType,
      requestFingerprint,
      sessionId: input.sessionId,
      storeId: scope.storeId as StoreId,
      tenantId: scope.tenantId as TenantId,
    });
    if (claimed.status === "existing") {
      assertSameCommand(claimed.receipt, {
        commandType: input.commandType,
        requestFingerprint,
        sessionId: input.sessionId,
      });
      if (!claimed.receipt.result) {
        throw new WhatsappSessionCommandConflictError(
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
        session: await reloadScopedWhatsappSession(
          ports,
          input.sessionId,
          scope,
        ),
      };
    }

    const mutation = await input.mutate(session, ports, {
      storeId: scope.storeId as StoreId,
      tenantId: scope.tenantId as TenantId,
    });
    await repository.complete({
      commandId: input.commandId,
      result: mutation.result,
      sessionRevision: mutation.session.revision,
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
    session: await sessionWithConnection(
      command.session,
      input.ports,
      input.sessionId,
    ),
  };
}

export async function reloadScopedWhatsappSession(
  ports: CrmServicePorts,
  sessionId: string,
  scope: { storeId: string; tenantId: string },
) {
  const [session] = await getCrmWhatsappRepository(ports).listSessions({
    limit: 1,
    offset: 0,
    sessionId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!session) throw new Error("CRM WhatsApp session disappeared.");
  return session;
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
    commandType: CrmWhatsappSessionCommandType;
    requestFingerprint: string;
    sessionId: string;
  },
  input: {
    commandType: CrmWhatsappSessionCommandType;
    requestFingerprint: string;
    sessionId: string;
  },
) {
  if (
    receipt.commandType === input.commandType &&
    receipt.requestFingerprint === input.requestFingerprint &&
    receipt.sessionId === input.sessionId
  ) {
    return;
  }
  throw new WhatsappSessionCommandConflictError(
    "unknown",
    "was reused for a different request",
  );
}
