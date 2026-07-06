import { useCallback } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import type { CrmWhatsappScheduledMessage } from "./crmWhatsappTypes";
import { asError } from "./crmWhatsappHookSupport";

export function useCrmWhatsappScheduledMessages(
  api: CrmWhatsappApi,
  setError: (error: Error) => void,
) {
  const createScheduledMessage = useCallback(
    async (input: { scheduledAt: string; sessionId: string; text: string }) => {
      try {
        await api.createScheduledMessage(input);
        return true;
      } catch (caught) {
        setError(asError(caught));
        return false;
      }
    },
    [api, setError],
  );

  const listScheduledMessages = useCallback(
    async (sessionId: string): Promise<CrmWhatsappScheduledMessage[]> => {
      try {
        return await api.listScheduledMessages({ sessionId });
      } catch (caught) {
        setError(asError(caught));
        return [];
      }
    },
    [api, setError],
  );

  const cancelScheduledMessage = useCallback(
    async (scheduledMessageId: string) => {
      try {
        await api.cancelScheduledMessage(scheduledMessageId);
        return true;
      } catch (caught) {
        setError(asError(caught));
        return false;
      }
    },
    [api, setError],
  );

  const processDueScheduledMessages = useCallback(async () => {
    try {
      await api.processDueScheduledMessages();
      return true;
    } catch (caught) {
      setError(asError(caught));
      return false;
    }
  }, [api, setError]);

  return {
    cancelScheduledMessage,
    createScheduledMessage,
    listScheduledMessages,
    processDueScheduledMessages,
  };
}
