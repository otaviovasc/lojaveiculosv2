import { useCallback, useState } from "react";
import type { CrmConversationApi } from "./crmConversationApi";
import type {
  CrmCreateScheduledMessageInput,
  CrmListScheduledMessagesInput,
  CrmScheduledMessage,
} from "./crmConversationTypes";
import { asError } from "./crmConversationHookSupport";

export function useCrmScheduledMessages(
  api: CrmConversationApi,
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
    async (input: CrmCreateScheduledMessageInput) => {
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
      input: CrmListScheduledMessagesInput = {},
    ): Promise<CrmScheduledMessage[]> => {
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

  const updateScheduledMessage = useCallback(
    async (
      scheduledMessageId: string,
      input: { content: string; scheduledAt: string },
    ) => {
      try {
        await api.updateScheduledMessage(scheduledMessageId, input);
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
    updateScheduledMessage,
  };
}
