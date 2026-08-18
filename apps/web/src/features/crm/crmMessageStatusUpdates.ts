import type { CrmMessage } from "./crmConversationTypes";
import type { CrmMessageView } from "./crmConversationModel";

export type RealtimeMessageStatusUpdate = {
  lastCustomerReadAt?: string;
  messageId: CrmMessage["id"];
  status: CrmMessage["status"];
};

export function applyRealtimeMessageStatus(
  messages: CrmMessageView[],
  input: RealtimeMessageStatusUpdate,
) {
  return messages.map((message) =>
    String(message.id) === String(input.messageId) ||
    String(message.externalId ?? "") === String(input.messageId)
      ? {
          ...message,
          ...(input.lastCustomerReadAt
            ? {
                metadata: {
                  ...(message.metadata ?? {}),
                  lastCustomerReadAt: input.lastCustomerReadAt,
                },
              }
            : {}),
          status: input.status,
        }
      : message,
  );
}
