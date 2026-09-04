import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmMessage } from "../../ports/crmConversationRepository.js";
import { CrmMessageActionError } from "../../messaging/crmMessagingErrors.js";
import {
  getCrmMessagingGateway,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "./serviceSupport.js";
import {
  loadMessageActionTarget,
  messageActionAudit,
  updateTargetMessage,
  withoutReactionMetadata,
} from "./crmMessageActionSupport.js";

const permission = "crm.messages.send";

export type SendCrmReactionInput = {
  messageId: string;
  reaction: string;
};

export type RemoveCrmReactionInput = {
  messageId: string;
};

export type DeleteCrmMessageDtoInput = {
  messageId: string;
};

export async function sendCrmReaction(
  context: ServiceContext,
  input: SendCrmReactionInput,
  ports: CrmServicePorts,
): Promise<CrmMessage> {
  assertPermission(context, permission);
  const reaction = input.reaction.trim();
  if (!reaction) {
    throw new CrmMessageActionError("Reaction emoji is required.", 400);
  }
  logCrmServiceEvent(context, "crm.message.react.started", {
    messageId: input.messageId,
  });
  return recordCrmServiceMutation(
    context,
    messageActionAudit("crm.message.react", input.messageId, {
      reaction,
    }),
    async () => {
      const target = await loadMessageActionTarget(
        context,
        input,
        ports,
        "reactions",
      );
      const sent = await getCrmMessagingGateway(ports).sendReaction(
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

export async function removeCrmReaction(
  context: ServiceContext,
  input: RemoveCrmReactionInput,
  ports: CrmServicePorts,
): Promise<CrmMessage> {
  assertPermission(context, permission);
  logCrmServiceEvent(context, "crm.message.remove_reaction.started", {
    messageId: input.messageId,
  });
  return recordCrmServiceMutation(
    context,
    messageActionAudit("crm.message.remove_reaction", input.messageId),
    async () => {
      const target = await loadMessageActionTarget(
        context,
        input,
        ports,
        "reactions",
      );
      const sent = await getCrmMessagingGateway(ports).removeReaction(
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
            removedAt: sent.providerTimestamp.toISOString(),
            removedByActorId: context.actor.id,
          },
        },
      });
      return message;
    },
  );
}

export async function deleteCrmMessageDto(
  context: ServiceContext,
  input: DeleteCrmMessageDtoInput,
  ports: CrmServicePorts,
): Promise<CrmMessage> {
  assertPermission(context, permission);
  logCrmServiceEvent(context, "crm.message.delete.started", {
    messageId: input.messageId,
  });
  return recordCrmServiceMutation(
    context,
    messageActionAudit("crm.message.delete", input.messageId),
    async () => {
      const target = await loadMessageActionTarget(
        context,
        input,
        ports,
        "delete",
      );
      const deletedAt = new Date();
      await getCrmMessagingGateway(ports).deleteMessage(target.connection, {
        messageId: target.providerMessageId,
        owner: target.message.direction === "OUTBOUND",
        phone: target.phone,
      });
      return updateTargetMessage(context, ports, target, {
        action: "deleted",
        deletedAt,
        metadata: {
          ...target.message.metadata,
          deletedByActorId: context.actor.id,
        },
      });
    },
  );
}
