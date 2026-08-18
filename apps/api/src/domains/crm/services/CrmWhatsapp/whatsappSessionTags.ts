import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  type WhatsappSession,
  type WhatsappSessionTag,
} from "../../whatsapp/whatsappModels.js";
import {
  getCrmWhatsappRepository,
  requireCrmWhatsappScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  publishWhatsappSessionUpdate,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  findScopedWhatsappSession,
  sessionWithConnection,
} from "./whatsappSessionMutationSupport.js";

export {
  createWhatsappTag,
  deleteWhatsappTag,
  reorderWhatsappTags,
  updateWhatsappTag,
} from "./whatsappTagManagement.js";
export type {
  CreateWhatsappTagInput,
  DeleteWhatsappTagInput,
  ReorderWhatsappTagsInput,
  UpdateWhatsappTagInput,
} from "./whatsappTagManagement.js";

const tagAssignPermission = "crm.whatsapp.tags.assign";

export type AddWhatsappSessionTagInput = {
  color?: string;
  emoji?: string | null;
  name: string;
  sessionId: string;
};

export type ListWhatsappTagsInput = {
  connectionId?: string | null;
  limit?: number;
  search?: string;
};

export type RemoveWhatsappSessionTagInput = {
  sessionId: string;
  tagId: string;
};

export async function listWhatsappTags(
  context: ServiceContext,
  input: ListWhatsappTagsInput,
  ports: CrmServicePorts,
): Promise<readonly WhatsappSessionTag[]> {
  assertPermission(context, "crm.whatsapp.read");
  const scope = requireCrmWhatsappScope(context);
  return getCrmWhatsappRepository(ports).listTags({
    ...(input.connectionId !== undefined
      ? { connectionId: input.connectionId }
      : {}),
    limit: input.limit ?? 100,
    ...(input.search ? { search: input.search } : {}),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
}

export async function addWhatsappSessionTag(
  context: ServiceContext,
  input: AddWhatsappSessionTagInput,
  ports: CrmServicePorts,
): Promise<WhatsappSession> {
  assertPermission(context, tagAssignPermission);
  const name = input.name.trim();
  logWhatsappServiceEvent(context, "crm.whatsapp.session.tag.add.started", {
    name,
    sessionId: input.sessionId,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.session.tag.add",
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      metadata: { name },
      permission: tagAssignPermission,
      summary: "Added CRM WhatsApp session tag",
    },
    () => addSessionTag(context, { ...input, name }, ports),
  );
}

export async function removeWhatsappSessionTag(
  context: ServiceContext,
  input: RemoveWhatsappSessionTagInput,
  ports: CrmServicePorts,
): Promise<WhatsappSession> {
  assertPermission(context, tagAssignPermission);
  logWhatsappServiceEvent(context, "crm.whatsapp.session.tag.remove.started", {
    sessionId: input.sessionId,
    tagId: input.tagId,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.session.tag.remove",
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      metadata: { tagId: input.tagId },
      permission: tagAssignPermission,
      summary: "Removed CRM WhatsApp session tag",
    },
    () => removeSessionTag(context, input, ports),
  );
}

async function addSessionTag(
  context: ServiceContext,
  input: AddWhatsappSessionTagInput,
  ports: CrmServicePorts,
) {
  const scope = requireCrmWhatsappScope(context);
  const updated = await runCrmTransaction(ports, async (transactionPorts) => {
    const { session } = await findScopedWhatsappSession(
      context,
      { sessionId: input.sessionId },
      transactionPorts,
    );
    const repository = getCrmWhatsappRepository(transactionPorts);
    const tag = await repository.findOrCreateTag({
      color: input.color ?? "#64748b",
      connectionId: session.connectionId,
      emoji: input.emoji ?? null,
      name: input.name,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    return repository.addSessionTag({
      sessionId: input.sessionId,
      storeId: scope.storeId as never,
      tagId: tag.id,
      tenantId: scope.tenantId as never,
    });
  });
  const realtimeSession = await sessionWithConnection(
    updated,
    ports,
    input.sessionId,
  );
  await publishWhatsappSessionUpdate(ports, realtimeSession, scope);
  return realtimeSession;
}

async function removeSessionTag(
  context: ServiceContext,
  input: RemoveWhatsappSessionTagInput,
  ports: CrmServicePorts,
) {
  const scope = requireCrmWhatsappScope(context);
  const updated = await runCrmTransaction(ports, async (transactionPorts) => {
    await findScopedWhatsappSession(
      context,
      { sessionId: input.sessionId },
      transactionPorts,
    );
    return getCrmWhatsappRepository(transactionPorts).removeSessionTag({
      sessionId: input.sessionId,
      storeId: scope.storeId as never,
      tagId: input.tagId,
      tenantId: scope.tenantId as never,
    });
  });
  const realtimeSession = await sessionWithConnection(
    updated,
    ports,
    input.sessionId,
  );
  await publishWhatsappSessionUpdate(ports, realtimeSession, scope);
  return realtimeSession;
}
