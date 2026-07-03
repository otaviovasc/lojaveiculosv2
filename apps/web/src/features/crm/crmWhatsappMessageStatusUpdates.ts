import type { CrmWhatsappMessage } from "./crmWhatsappTypes";
import type { WhatsappMessageView } from "./crmWhatsappModel";

export type RealtimeMessageStatusUpdate = {
  lastCustomerReadAt?: string;
  messageId: CrmWhatsappMessage["id"];
  status: CrmWhatsappMessage["status"];
};

export function applyRealtimeMessageStatus(
  messages: WhatsappMessageView[],
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
