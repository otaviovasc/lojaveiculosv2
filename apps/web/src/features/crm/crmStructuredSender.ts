import type { Dispatch, SetStateAction } from "react";
import type { CrmMessage, CrmConversationCycle } from "./crmConversationTypes";
import { asError } from "./crmConversationHookSupport";
import { formatSentPreview } from "./crmSentPreview";
import type { CrmMessageView } from "./crmConversationModel";
import { reconcileCrmMessages } from "./crmMessageReconciliation";
import { mergeCrmMessageStatus } from "./crmMessageStatusUpdates";
import { readCrmFailedSendStatus } from "./crmSendOutcome";

type StructuredSendInput = {
  activeSession: CrmConversationCycle;
  mergeCycles: (
    nextSessions: CrmConversationCycle[],
    options?: {
      preserveLocalOnly?: boolean;
      snapshotKind?: "mutation" | "poll" | "realtime" | "reconciled";
    },
  ) => void;
  optimistic: CrmMessageView;
  request: (idempotencyKey: string) => Promise<CrmMessage>;
  setError: (error: Error) => void;
  setIsSending: Dispatch<SetStateAction<boolean>>;
  setMessages: Dispatch<SetStateAction<CrmMessageView[]>>;
};

const structuredRetries = new Map<string, StructuredSendInput>();

export async function sendOptimisticStructuredMessage(
  input: StructuredSendInput,
) {
  const idempotencyKey = input.optimistic.clientId ?? crypto.randomUUID();
  return executeStructuredSend(input, idempotencyKey, true);
}

export function retryOptimisticStructuredMessage(message: CrmMessageView) {
  const key = message.clientId;
  const retry = key ? structuredRetries.get(key) : undefined;
  if (!retry || message.status !== "FAILED") return Promise.resolve(false);
  return executeStructuredSend(
    { ...retry, optimistic: message },
    crypto.randomUUID(),
    false,
  );
}

export function hasOptimisticStructuredRetry(message: CrmMessageView) {
  return Boolean(message.clientId && structuredRetries.has(message.clientId));
}

export function discardOptimisticStructuredRetry(message: CrmMessageView) {
  if (message.clientId) structuredRetries.delete(message.clientId);
}

async function executeStructuredSend(
  input: StructuredSendInput,
  idempotencyKey: string,
  append: boolean,
) {
  const previousAttempt = { ...input.optimistic };
  delete previousAttempt.clientRequestId;
  delete previousAttempt.externalId;
  const optimistic = {
    ...previousAttempt,
    id: input.optimistic.clientId ?? input.optimistic.id,
    metadata: { ...input.optimistic.metadata, idempotencyKey },
    status: "PENDING" as const,
  };
  input.setMessages((current) =>
    append
      ? [...current, optimistic]
      : current.map((message) =>
          message.clientId === optimistic.clientId ? optimistic : message,
        ),
  );
  input.setIsSending(true);
  try {
    const sent = await input.request(idempotencyKey);
    input.setMessages(
      (current) => reconcileCrmMessages(current, sent).messages,
    );
    if (optimistic.clientId) structuredRetries.delete(optimistic.clientId);
    input.mergeCycles(
      [
        {
          ...input.activeSession,
          lastMessageAt: sent.createdAt,
          lastMessageContent: formatSentPreview(sent),
          status: "HUMAN_TAKEOVER",
        },
      ],
      { preserveLocalOnly: true, snapshotKind: "mutation" },
    );
    return true;
  } catch (caught) {
    let confirmed = false;
    input.setMessages((current) =>
      current.map((message) => {
        if (message.clientId !== optimistic.clientId) return message;
        confirmed = isConfirmedStatus(message.status);
        return confirmed
          ? message
          : {
              ...message,
              metadata: { ...message.metadata, idempotencyKey },
              status: mergeCrmMessageStatus(
                message.status,
                readCrmFailedSendStatus(caught),
              ),
            };
      }),
    );
    if (confirmed) {
      if (optimistic.clientId) structuredRetries.delete(optimistic.clientId);
      return true;
    }
    if (optimistic.clientId) {
      structuredRetries.set(optimistic.clientId, { ...input, optimistic });
    }
    input.setError(asError(caught));
    return false;
  } finally {
    input.setIsSending(false);
  }
}

function isConfirmedStatus(status: CrmMessage["status"]) {
  return status === "SENT" || status === "DELIVERED" || status === "READ";
}
