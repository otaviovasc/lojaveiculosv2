import type { Dispatch, SetStateAction } from "react";
import type { CrmMessage, CrmConversationCycle } from "./crmConversationTypes";
import { asError } from "./crmConversationHookSupport";
import { formatSentPreview } from "./crmSentPreview";
import type { CrmMessageView } from "./crmConversationModel";

export async function sendOptimisticStructuredMessage(input: {
  activeSession: CrmConversationCycle;
  mergeCycles: (nextSessions: CrmConversationCycle[]) => void;
  optimistic: CrmMessageView;
  request: (idempotencyKey: string) => Promise<CrmMessage>;
  setError: (error: Error) => void;
  setIsSending: Dispatch<SetStateAction<boolean>>;
  setMessages: Dispatch<SetStateAction<CrmMessageView[]>>;
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
    input.mergeCycles([
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
