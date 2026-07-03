import { useCallback, useState } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { asError } from "./crmWhatsappHookSupport";
import type {
  CrmWhatsappConnectionId,
  CrmWhatsappSession,
  CrmWhatsappSessionId,
  CrmWhatsappStartConversationInput,
} from "./crmWhatsappTypes";

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
    async (input: Omit<CrmWhatsappStartConversationInput, "connectionId">) => {
      if (!connectionId || !canSend) return false;
      setIsStartingConversation(true);
      try {
        const result = await api.startConversation({
          ...input,
          connectionId,
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
