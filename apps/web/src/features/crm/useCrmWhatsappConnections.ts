import { useCallback, useEffect, useState } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { asError } from "./crmWhatsappHookSupport";
import type {
  CrmWhatsappComposioCompleteResult,
  CrmWhatsappConfigureWebhooksResult,
  CrmWhatsappConnectionAllowance,
  CrmWhatsappConnectionId,
  CrmWhatsappCreateConnectionInput,
  CrmWhatsappProviderConnection,
  CrmWhatsappSetupProvider,
  CrmWhatsappUpdateConnectionInput,
} from "./crmWhatsappTypes";

const fallbackAllowance: CrmWhatsappConnectionAllowance = {
  limit: 0,
  remaining: 0,
  used: 0,
};

export function useCrmWhatsappConnections(api: CrmWhatsappApi) {
  const [allowance, setAllowance] = useState(fallbackAllowance);
  const [availableProviders, setAvailableProviders] = useState<
    CrmWhatsappSetupProvider[]
  >([]);
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
      setAllowance(payload.allowance);
      setAvailableProviders(payload.availableProviders);
    } catch (caught) {
      setError(asError(caught));
    }
  }, [loadConnections]);

  const createConnection = useCallback(
    async (input: CrmWhatsappCreateConnectionInput) => {
      try {
        const created = await api.createConnection(input);
        await refreshConnections();
        return created;
      } catch (caught) {
        setError(asError(caught));
        return null;
      }
    },
    [api, refreshConnections],
  );

  const requestZapiPairingQr = useCallback(
    async (connectionId: CrmWhatsappConnectionId) => {
      try {
        return await api.requestZapiPairingQr(connectionId);
      } catch (caught) {
        setError(asError(caught));
        throw caught;
      }
    },
    [api],
  );

  const requestZapiPairingCode = useCallback(
    async (connectionId: CrmWhatsappConnectionId, phone: string) => {
      try {
        return await api.requestZapiPairingCode(connectionId, phone);
      } catch (caught) {
        setError(asError(caught));
        throw caught;
      }
    },
    [api],
  );

  const authorizeComposio = useCallback(
    (connectionId: CrmWhatsappConnectionId) =>
      api.authorizeComposioConnection(connectionId),
    [api],
  );

  const completeComposio = useCallback(
    async (
      connectionId: CrmWhatsappConnectionId,
    ): Promise<CrmWhatsappComposioCompleteResult> => {
      try {
        const result = await api.completeComposioConnection(connectionId);
        setConnections((current) =>
          current.map((connection) =>
            connection.id === result.connection.id
              ? result.connection
              : connection,
          ),
        );
        return result;
      } catch (caught) {
        setError(asError(caught));
        throw caught;
      }
    },
    [api],
  );

  const selectComposioSender = useCallback(
    async (connectionId: CrmWhatsappConnectionId, senderId: string) => {
      try {
        const updated = await api.selectComposioSender(connectionId, senderId);
        await refreshConnections();
        return updated;
      } catch (caught) {
        setError(asError(caught));
        throw caught;
      }
    },
    [api, refreshConnections],
  );

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

  const configureWebhooks = useCallback(
    async (
      connectionId: CrmWhatsappConnectionId,
    ): Promise<CrmWhatsappConfigureWebhooksResult | null> => {
      try {
        return await api.configureConnectionWebhooks(connectionId);
      } catch (caught) {
        setError(asError(caught));
        return null;
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
        if (active) {
          setConnections(payload.connections);
          setAllowance(payload.allowance);
          setAvailableProviders(payload.availableProviders);
        }
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
    allowance,
    authorizeComposio,
    availableProviders,
    completeComposio,
    configureWebhooks,
    connections,
    createConnection,
    error,
    hasConnectedConnection: connections.some(
      (connection) =>
        connection.live.providerStatus === "connected" ||
        connection.live.connected === true,
    ),
    isLoading,
    refreshConnections,
    requestZapiPairingCode,
    requestZapiPairingQr,
    selectComposioSender,
    updateConnection,
  };
}
