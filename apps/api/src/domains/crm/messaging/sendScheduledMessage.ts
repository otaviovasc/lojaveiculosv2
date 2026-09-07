import type { ServiceContext } from "../../../shared/serviceContext.js";
import { assertPermission } from "../../../shared/authorization.js";
import type { CrmScheduledMessage } from "../ports/crmConversationRepository.js";
import type { CrmServicePorts } from "../services/CrmService/types.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../services/CrmMessagingService/serviceSupport.js";
import { CrmMessageActionError } from "./crmMessagingErrors.js";
import { sendOutboundMessage } from "./sendOutboundMessage.js";
import {
  extractScheduledMediaMetadata,
  prepareScheduledOutboundPayload,
} from "./crmScheduledMediaDispatch.js";

/**
 * Deliver one persisted scheduled message through the durable outbound intent
 * workflow. The scheduled id is the provider-effect idempotency key, and the
 * preparation callback receives the provider address resolved from the
 * canonical conversation cycle.
 */
export async function sendScheduledMessage(
  context: ServiceContext,
  scheduledMessage: CrmScheduledMessage,
  ports: CrmServicePorts,
) {
  const permission = "crm.messages.send";
  assertPermission(context, permission);
  const media = extractScheduledMediaMetadata(scheduledMessage.metadata);
  if (media && scheduledMessage.campaignId && !media.mediaStorageKey) {
    throw new CrmMessageActionError(
      "Scheduled campaign media is missing its managed storage reference.",
    );
  }
  const event = media
    ? "crm.message.send_media.started"
    : "crm.message.send_text.started";
  logCrmServiceEvent(context, event, {
    cycleId: scheduledMessage.cycleId,
    ...(media ? { mediaType: media.mediaType } : {}),
  });
  return recordCrmServiceMutation(
    context,
    {
      action: media ? "crm.message.send_media" : "crm.message.send_text",
      category: "data_change",
      entityId: scheduledMessage.cycleId,
      entityType: "crm_conversation_cycle",
      metadata: media
        ? {
            hasCaption: Boolean(scheduledMessage.content.trim()),
            mediaType: media.mediaType,
          }
        : { textLength: scheduledMessage.content.length },
      permission,
      summary: media
        ? "Sent CRM media message"
        : "Sent CRM WhatsApp text message",
    },
    () =>
      sendOutboundMessage(
        context,
        {
          idempotencyKey: `scheduled:${scheduledMessage.id}`,
          // Text schedules already use this payload in sendMessage. Keep it
          // byte-for-byte compatible so an in-flight schedule can be replayed
          // after this worker starts using the durable helper. Media gets an
          // immutable asset/content fingerprint because its payload differs.
          idempotencyPayload: media
            ? {
                caption: scheduledMessage.content,
                cycleId: scheduledMessage.cycleId,
                fileName: media.mediaFileName,
                mediaStorageKey: media.mediaStorageKey,
                mediaType: media.mediaType,
                mediaUrl: media.mediaStorageKey ? null : media.mediaUrl,
              }
            : {
                replyToMessageId: null,
                cycleId: scheduledMessage.cycleId,
                text: scheduledMessage.content,
              },
          ...(media
            ? { requiredCapabilities: ["outbound", "media"] as const }
            : {}),
          senderOrigin: "system",
          senderType: "SYSTEM",
          cycleId: scheduledMessage.cycleId,
          prepare: async ({ connection, gateway, phone }) =>
            prepareScheduledOutboundPayload(gateway, connection, {
              content: scheduledMessage.content,
              id: scheduledMessage.id,
              metadata: scheduledMessage.metadata,
              recipientAddress: phone,
            }),
        },
        ports,
      ),
  );
}
