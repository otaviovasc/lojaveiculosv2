import { useCallback, useEffect, useState } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { asError } from "./crmWhatsappHookSupport";
import type { CrmWhatsappProviderConnection } from "./crmWhatsappTypes";

export function useCrmWhatsappConnections(api: CrmWhatsappApi) {
  const [connections, setConnections] = useState<
    CrmWhatsappProviderConnection[]
  >([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadConnections = useCallback(() => api.listConnections(), [api]);

  const refreshConnections = useCallback(async () => {
    const payload = await loadConnections();
    setConnections(payload.connections);
  }, [loadConnections]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    void loadConnections()
      .then((payload) => {
        if (active) setConnections(payload.connections);
      })
      .catch((caught) => {
        if (active) setError(asError(caught));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadConnections]);

  return {
    connections,
    error,
    hasConnectedConnection: connections.some(
      (connection) =>
        connection.live.providerStatus === "connected" ||
        connection.live.connected === true,
    ),
    isLoading,
    refreshConnections,
  };
}
