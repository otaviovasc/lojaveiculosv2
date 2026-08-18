import { useCallback, useState } from "react";
import type { CrmConversationApi } from "./crmConversationApi";
import { asError } from "./crmConversationHookSupport";
import type {
  CrmConnectionId,
  CrmConversationCycle,
  CrmConversationCycleId,
  CrmStartConversationInput,
} from "./crmConversationTypes";

type StartConversationInputWithoutConnection =
  CrmStartConversationInput extends infer Input
    ? Input extends { connectionId: CrmConnectionId }
      ? Omit<Input, "connectionId">
      : never
    : never;

export function useCrmStartConversation({
  api,
  canSend,
  connectionId,
  mergeCycles,
  setActiveCycleId,
  setError,
}: {
  api: CrmConversationApi;
  canSend: boolean;
  connectionId: CrmConnectionId | null;
  mergeCycles: (
    conversationCycles: CrmConversationCycle[],
    options?: { preserveLocalOnly?: boolean },
  ) => void;
  setActiveCycleId: (cycleId: CrmConversationCycleId) => void;
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
        mergeCycles([result.cycle], { preserveLocalOnly: true });
        setActiveCycleId(result.cycle.id);
        setError(null);
        return true;
      } catch (error) {
        setError(asError(error));
        return false;
      } finally {
        setIsStartingConversation(false);
      }
    },
    [api, canSend, connectionId, mergeCycles, setActiveCycleId, setError],
  );
  return { isStartingConversation, startConversation };
}
