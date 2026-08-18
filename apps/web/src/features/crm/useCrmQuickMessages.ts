import { useCallback, useEffect, useState } from "react";
import type { CrmConversationApi } from "./crmConversationApi";
import { asError } from "./crmConversationHookSupport";
import type {
  CrmCreateQuickMessageInput,
  CrmQuickMessage,
  CrmUpdateQuickMessageInput,
} from "./crmConversationTypes";

export function useCrmQuickMessages(
  api: CrmConversationApi,
  setError: (error: Error) => void,
) {
  const [quickMessages, setQuickMessages] = useState<CrmQuickMessage[]>([]);
  const refreshQuickMessages = useCallback(async () => {
    const nextMessages = await api.listQuickMessages();
    setQuickMessages(nextMessages);
    return nextMessages;
  }, [api]);

  useEffect(() => {
    let active = true;
    void refreshQuickMessages().catch((caught) => {
      if (active) setError(asError(caught));
    });
    return () => {
      active = false;
    };
  }, [refreshQuickMessages, setError]);

  const createQuickMessage = useCallback(
    async (input: CrmCreateQuickMessageInput) => {
      try {
        await api.createQuickMessage(input);
        await refreshQuickMessages();
        return true;
      } catch (caught) {
        setError(asError(caught));
        return false;
      }
    },
    [api, refreshQuickMessages, setError],
  );

  const updateQuickMessage = useCallback(
    async (
      quickMessage: CrmQuickMessage,
      input: CrmUpdateQuickMessageInput,
    ) => {
      if (quickMessage.isSystem) return false;
      try {
        await api.updateQuickMessage(quickMessage.id, input);
        await refreshQuickMessages();
        return true;
      } catch (caught) {
        setError(asError(caught));
        return false;
      }
    },
    [api, refreshQuickMessages, setError],
  );

  const deleteQuickMessage = useCallback(
    async (quickMessage: CrmQuickMessage) => {
      if (quickMessage.isSystem) return false;
      try {
        await api.deleteQuickMessage(quickMessage.id);
        await refreshQuickMessages();
        return true;
      } catch (caught) {
        setError(asError(caught));
        return false;
      }
    },
    [api, refreshQuickMessages, setError],
  );

  return {
    createQuickMessage,
    deleteQuickMessage,
    quickMessages,
    refreshQuickMessages,
    updateQuickMessage,
  };
}
