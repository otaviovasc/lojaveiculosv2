import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmCoreRepository } from "../../ports/crmCoreRepository.js";
import { CrmCoreNotFoundError, CrmCoreRuleError } from "../errors.js";
import type { Connection, Conversation } from "../models.js";
import { auditCoreMutation, authorizeCoreMutation } from "./serviceSupport.js";

export async function startConversation(
  context: ServiceContext,
  input: { connectionId: string; contactId: string },
  repository: CrmCoreRepository,
): Promise<Conversation> {
  const scope = authorizeCoreMutation(context);
  const connection = await repository.get({
    ...scope,
    id: input.connectionId,
    resource: "connections",
  });
  if (!connection)
    throw new CrmCoreNotFoundError("connections", input.connectionId);
  assertOutboundCapable(connection);
  const contact = await repository.get({
    ...scope,
    id: input.contactId,
    resource: "contacts",
  });
  if (!contact) throw new CrmCoreNotFoundError("contacts", input.contactId);
  if (contact.mergedIntoContactId) {
    throw new CrmCoreRuleError(
      "Conversation must reference the active contact after a merge.",
      "CRM_CONVERSATION_CONTACT_MERGED",
    );
  }
  const identities = await repository.list({
    ...scope,
    resource: "contact-identities",
  });
  const contactIdentities = identities.filter(
    (identity) =>
      identity.contactId === input.contactId &&
      identity.verification === "verified",
  );
  if (connection.channel === "whatsapp") {
    const hasPhone = contactIdentities.some(
      (identity) => identity.kind === "phone",
    );
    const consents = await repository.list({ ...scope, resource: "consents" });
    const currentConsent = consents
      .filter(
        (consent) =>
          consent.channel === "whatsapp" &&
          consent.contactId === input.contactId,
      )
      .sort(
        (left, right) =>
          right.occurredAt.getTime() - left.occurredAt.getTime() ||
          right.createdAt.getTime() - left.createdAt.getTime(),
      )[0];
    const optedIn = currentConsent?.status === "opt_in";
    if (!hasPhone || !optedIn) {
      throw new CrmCoreRuleError(
        "Starting WhatsApp requires a confirmed phone and current opt-in.",
        "CRM_WHATSAPP_PHONE_AND_OPT_IN_REQUIRED",
      );
    }
  }
  const conversation = await repository.create({
    data: {
      attendanceState: "bot_active",
      channel: connection.channel,
      connectionId: connection.id,
      contactId: input.contactId,
      pipelineId: null,
      pipelineStageId: null,
      threadState: "open",
      transportProvider: connection.transportProvider,
      unreadCount: 0,
    },
    resource: "conversations",
    scope,
  });
  await auditCoreMutation(context, {
    action: "crm.core.conversation.start",
    entityId: conversation.id,
    entityType: "conversation",
  });
  return conversation;
}

export async function recordInboundConversation(
  context: ServiceContext,
  input: { conversationId: string; expectedRevision: number },
  repository: CrmCoreRepository,
): Promise<Conversation> {
  const scope = authorizeCoreMutation(context);
  const current = await repository.get({
    ...scope,
    id: input.conversationId,
    resource: "conversations",
  });
  if (!current)
    throw new CrmCoreNotFoundError("conversations", input.conversationId);
  const updated = await repository.update({
    ...scope,
    expectedRevision: input.expectedRevision,
    id: current.id,
    patch: {
      attendanceState: current.attendanceState,
      pipelineId: current.pipelineId,
      pipelineStageId: current.pipelineStageId,
      threadState: "open",
      unreadCount: current.unreadCount + 1,
    },
    resource: "conversations",
  });
  if (!updated) throw new CrmCoreNotFoundError("conversations", current.id);
  await auditCoreMutation(context, {
    action: "crm.core.conversation.inbound",
    entityId: updated.id,
    entityType: "conversation",
  });
  return updated;
}

function assertOutboundCapable(connection: Connection): void {
  if (
    !connection.operational ||
    connection.degraded ||
    !connection.capabilities.outbound
  ) {
    throw new CrmCoreRuleError(
      "Connection cannot start outbound conversations.",
      connection.errorCode ?? "CRM_CONNECTION_NOT_OUTBOUND_CAPABLE",
    );
  }
}
