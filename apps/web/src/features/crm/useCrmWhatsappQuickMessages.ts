import { useCallback, useEffect, useState } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { asError } from "./crmWhatsappHookSupport";
import type {
  CrmWhatsappCreateQuickMessageInput,
  CrmWhatsappQuickMessage,
  CrmWhatsappUpdateQuickMessageInput,
} from "./crmWhatsappTypes";

export function useCrmWhatsappQuickMessages(
  api: CrmWhatsappApi,
  setError: (error: Error) => void,
) {
  const [quickMessages, setQuickMessages] = useState<CrmWhatsappQuickMessage[]>(
    [],
  );
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
    async (input: CrmWhatsappCreateQuickMessageInput) => {
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
      quickMessage: CrmWhatsappQuickMessage,
      input: CrmWhatsappUpdateQuickMessageInput,
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
    async (quickMessage: CrmWhatsappQuickMessage) => {
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
