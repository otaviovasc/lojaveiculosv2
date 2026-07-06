import { useCallback, useEffect, useState } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { asError } from "./crmWhatsappHookSupport";
import type {
  CrmWhatsappConnectionId,
  CrmWhatsappProviderConnection,
  CrmWhatsappUpdateConnectionInput,
} from "./crmWhatsappTypes";

export function useCrmWhatsappConnections(api: CrmWhatsappApi) {
  const [connections, setConnections] = useState<
    CrmWhatsappProviderConnection[]
  >([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadConnections = useCallback(() => api.listConnections(), [api]);

  const refreshConnections = useCallback(async () => {
    try {
      const payload = await loadConnections();
      setConnections(payload.connections);
    } catch (caught) {
      setError(asError(caught));
    }
  }, [loadConnections]);

  const updateConnection = useCallback(
    async (
      connectionId: CrmWhatsappConnectionId,
      input: CrmWhatsappUpdateConnectionInput,
    ) => {
      try {
        const updated = await api.updateConnection(connectionId, input);
        setConnections((current) =>
          current.map((connection) =>
            connection.id === updated.id ? updated : connection,
          ),
        );
        return true;
      } catch (caught) {
        setError(asError(caught));
        return false;
      }
    },
    [api],
  );

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
    updateConnection,
  };
}
