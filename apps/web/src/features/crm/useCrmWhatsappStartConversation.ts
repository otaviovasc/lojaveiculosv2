import { useCallback, useState } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { asError } from "./crmWhatsappHookSupport";
import type {
  CrmWhatsappConnectionId,
  CrmWhatsappSession,
  CrmWhatsappSessionId,
  CrmWhatsappStartConversationInput,
} from "./crmWhatsappTypes";

type StartConversationInputWithoutConnection =
  CrmWhatsappStartConversationInput extends infer Input
    ? Input extends { connectionId: CrmWhatsappConnectionId }
      ? Omit<Input, "connectionId">
      : never
    : never;

export function useCrmWhatsappStartConversation({
  api,
  canSend,
  connectionId,
  mergeSessions,
  setActiveSessionId,
  setError,
}: {
  api: CrmWhatsappApi;
  canSend: boolean;
  connectionId: CrmWhatsappConnectionId | null;
  mergeSessions: (
    sessions: CrmWhatsappSession[],
    options?: { preserveLocalOnly?: boolean },
  ) => void;
  setActiveSessionId: (sessionId: CrmWhatsappSessionId) => void;
  setError: (error: Error | null) => void;
}) {
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const startConversation = useCallback(
    async (input: StartConversationInputWithoutConnection) => {
      if (!connectionId || !canSend) return false;
      setIsStartingConversation(true);
      try {
        const result = input.template
          ? await api.startConversation({
              ...input,
              connectionId,
              template: input.template,
            })
          : await api.startConversation({
              ...input,
              connectionId,
              text: input.text,
            });
        mergeSessions([result.session], { preserveLocalOnly: true });
        setActiveSessionId(result.session.id);
        setError(null);
        return true;
      } catch (error) {
        setError(asError(error));
        return false;
      } finally {
        setIsStartingConversation(false);
      }
    },
    [api, canSend, connectionId, mergeSessions, setActiveSessionId, setError],
  );
  return { isStartingConversation, startConversation };
}
