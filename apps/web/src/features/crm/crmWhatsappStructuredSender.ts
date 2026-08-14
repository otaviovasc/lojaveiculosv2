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
  request: (idempotencyKey: string) => Promise<CrmWhatsappMessage>;
  setError: (error: Error) => void;
  setIsSending: Dispatch<SetStateAction<boolean>>;
  setMessages: Dispatch<SetStateAction<WhatsappMessageView[]>>;
}) {
  const idempotencyKey = input.optimistic.clientId ?? crypto.randomUUID();
  const optimistic = {
    ...input.optimistic,
    metadata: { ...input.optimistic.metadata, idempotencyKey },
  };
  input.setMessages((current) => [...current, optimistic]);
  input.setIsSending(true);
  try {
    const sent = await input.request(idempotencyKey);
    const localClientId = optimistic.clientId;
    input.setMessages((current) =>
      current.map((message) =>
        message.clientId === optimistic.clientId
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
      current.map((message) =>
        message.clientId === optimistic.clientId
          ? { ...message, status: readFailureStatus(caught) }
          : message,
      ),
    );
    input.setError(asError(caught));
    return false;
  } finally {
    input.setIsSending(false);
  }
}

function readFailureStatus(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code).toLocaleLowerCase("en-US")
      : "";
  return code.includes("indeterminate") || code.includes("unconfirmed")
    ? "INDETERMINATE"
    : "FAILED";
}
