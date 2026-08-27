import { useCallback, useEffect, useState } from "react";
import type { CrmConversationApi } from "./crmConversationApi";
import type { CrmRoutingPolicy } from "./crmRoutingTypes";

export function useCrmRoutingPolicy(
  api: Pick<CrmConversationApi, "getRoutingPolicy">,
  enabled: boolean,
) {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [policy, setPolicy] = useState<CrmRoutingPolicy | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setPolicy(await api.getRoutingPolicy());
    } catch (caught) {
      setPolicy(null);
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    } finally {
      setIsLoading(false);
    }
  }, [api, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const clearError = useCallback(() => setError(null), []);

  return { clearError, error, isLoading, policy, refresh };
}
