import { useCallback, useState } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import type {
  CrmWhatsappListScheduledMessagesInput,
  CrmWhatsappScheduledMessage,
} from "./crmWhatsappTypes";
import { asError } from "./crmWhatsappHookSupport";

export function useCrmWhatsappScheduledMessages(
  api: CrmWhatsappApi,
  setError: (error: Error) => void,
) {
  const [error, setScheduleError] = useState<Error | null>(null);

  const fail = useCallback(
    (caught: unknown) => {
      const error = asError(caught);
      setScheduleError(error);
      setError(error);
    },
    [setError],
  );

  const createScheduledMessage = useCallback(
    async (input: { scheduledAt: string; sessionId: string; text: string }) => {
      try {
        await api.createScheduledMessage(input);
        setScheduleError(null);
        return true;
      } catch (caught) {
        fail(caught);
        return false;
      }
    },
    [api, fail],
  );

  const listScheduledMessages = useCallback(
    async (
      input: CrmWhatsappListScheduledMessagesInput = {},
    ): Promise<CrmWhatsappScheduledMessage[]> => {
      try {
        const messages = await api.listScheduledMessages(input);
        setScheduleError(null);
        return messages;
      } catch (caught) {
        fail(caught);
        return [];
      }
    },
    [api, fail],
  );

  const cancelScheduledMessage = useCallback(
    async (scheduledMessageId: string) => {
      try {
        await api.cancelScheduledMessage(scheduledMessageId);
        setScheduleError(null);
        return true;
      } catch (caught) {
        fail(caught);
        return false;
      }
    },
    [api, fail],
  );

  const processDueScheduledMessages = useCallback(async () => {
    try {
      await api.processDueScheduledMessages();
      setScheduleError(null);
      return true;
    } catch (caught) {
      fail(caught);
      return false;
    }
  }, [api, fail]);

  return {
    cancelScheduledMessage,
    createScheduledMessage,
    error,
    listScheduledMessages,
    processDueScheduledMessages,
  };
}
