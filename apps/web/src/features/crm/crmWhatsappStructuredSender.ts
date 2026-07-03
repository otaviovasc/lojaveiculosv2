import type { Dispatch, SetStateAction } from "react";
import type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";
import { asError } from "./crmWhatsappHookSupport";
import { formatSentPreview } from "./crmWhatsappSentPreview";
import type { WhatsappMessageView } from "./crmWhatsappModel";

export async function sendOptimisticStructuredMessage(input: {
  activeSession: CrmWhatsappSession;
  mergeSessions: (nextSessions: CrmWhatsappSession[]) => void;
  optimistic: WhatsappMessageView;
  request: () => Promise<CrmWhatsappMessage>;
  setError: (error: Error) => void;
  setIsSending: Dispatch<SetStateAction<boolean>>;
  setMessages: Dispatch<SetStateAction<WhatsappMessageView[]>>;
}) {
  input.setMessages((current) => [...current, input.optimistic]);
  input.setIsSending(true);
  try {
    const sent = await input.request();
    const localClientId = input.optimistic.clientId;
    input.setMessages((current) =>
      current.map((message) =>
        message.clientId === input.optimistic.clientId
          ? { ...sent, ...(localClientId ? { clientId: localClientId } : {}) }
          : message,
      ),
    );
    input.mergeSessions([
      {
        ...input.activeSession,
        lastMessageAt: sent.createdAt,
        lastMessageContent: formatSentPreview(sent),
        status: "HUMAN_TAKEOVER",
      },
    ]);
    return true;
  } catch (caught) {
    input.setMessages((current) =>
      current.filter(
        (message) => message.clientId !== input.optimistic.clientId,
      ),
    );
    input.setError(asError(caught));
    return false;
  } finally {
    input.setIsSending(false);
  }
}
