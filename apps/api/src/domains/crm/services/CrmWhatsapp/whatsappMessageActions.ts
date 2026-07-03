import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { WhatsappMessage } from "../../whatsapp/whatsappModels.js";
import { WhatsappMessageActionError } from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmWhatsappGateway,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  loadMessageActionTarget,
  messageActionAudit,
  updateTargetMessage,
  withoutReactionMetadata,
} from "./whatsappMessageActionSupport.js";

const permission = "crm.whatsapp.send";

export type SendWhatsappReactionInput = {
  messageId: string;
  reaction: string;
};

export type RemoveWhatsappReactionInput = {
  messageId: string;
};

export type DeleteWhatsappMessageInput = {
  messageId: string;
};

export async function sendWhatsappReaction(
  context: ServiceContext,
  input: SendWhatsappReactionInput,
  ports: CrmServicePorts,
): Promise<WhatsappMessage> {
  assertPermission(context, permission);
  const reaction = input.reaction.trim();
  if (!reaction) {
    throw new WhatsappMessageActionError("Reaction emoji is required.", 400);
  }
  logWhatsappServiceEvent(context, "crm.whatsapp.message.react.started", {
    messageId: input.messageId,
  });
  return recordWhatsappServiceMutation(
    context,
    messageActionAudit("crm.whatsapp.message.react", input.messageId, {
      reaction,
    }),
    async () => {
      const target = await loadMessageActionTarget(context, input, ports);
      const sent = await getCrmWhatsappGateway(ports).sendReaction(
        target.connection,
        {
          messageId: target.providerMessageId,
          phone: target.phone,
          reaction,
        },
      );
      const message = await updateTargetMessage(context, ports, target, {
        action: "reaction",
        metadata: {
          ...target.message.metadata,
          reaction: {
            providerMessageId: sent.externalId,
            raw: sent.raw,
            sentAt: sent.providerTimestamp.toISOString(),
            sentByActorId: context.actor.id,
            value: reaction,
          },
        },
      });
      return message;
    },
  );
}

export async function removeWhatsappReaction(
  context: ServiceContext,
  input: RemoveWhatsappReactionInput,
  ports: CrmServicePorts,
): Promise<WhatsappMessage> {
  assertPermission(context, permission);
  logWhatsappServiceEvent(
    context,
    "crm.whatsapp.message.remove_reaction.started",
    { messageId: input.messageId },
  );
  return recordWhatsappServiceMutation(
    context,
    messageActionAudit("crm.whatsapp.message.remove_reaction", input.messageId),
    async () => {
      const target = await loadMessageActionTarget(context, input, ports);
      const sent = await getCrmWhatsappGateway(ports).removeReaction(
        target.connection,
        {
          messageId: target.providerMessageId,
          phone: target.phone,
        },
      );
      const metadata = withoutReactionMetadata(target.message);
      const message = await updateTargetMessage(context, ports, target, {
        action: "reaction_removed",
        metadata: {
          ...metadata,
          reactionRemoved: {
            providerMessageId: sent.externalId,
            raw: sent.raw,
            removedAt: sent.providerTimestamp.toISOString(),
            removedByActorId: context.actor.id,
          },
        },
      });
      return message;
    },
  );
}

export async function deleteWhatsappMessage(
  context: ServiceContext,
  input: DeleteWhatsappMessageInput,
  ports: CrmServicePorts,
): Promise<WhatsappMessage> {
  assertPermission(context, permission);
  logWhatsappServiceEvent(context, "crm.whatsapp.message.delete.started", {
    messageId: input.messageId,
  });
  return recordWhatsappServiceMutation(
    context,
    messageActionAudit("crm.whatsapp.message.delete", input.messageId),
    async () => {
      const target = await loadMessageActionTarget(context, input, ports);
      const deletedAt = new Date();
      const result = await getCrmWhatsappGateway(ports).deleteMessage(
        target.connection,
        {
          messageId: target.providerMessageId,
          owner: target.message.direction === "OUTBOUND",
          phone: target.phone,
        },
      );
      return updateTargetMessage(context, ports, target, {
        action: "deleted",
        deletedAt,
        metadata: {
          ...target.message.metadata,
          deletedByActorId: context.actor.id,
          deleteProviderRaw: result.raw,
        },
      });
    },
  );
}
