import { useCallback, useEffect, useRef, useState } from "react";
import type { CrmConversationApi } from "./crmConversationApi";
import { asError } from "./crmConversationHookSupport";
import type {
  CrmComposioCompleteResult,
  CrmAvailableSetup,
  CrmConnectionAllowance,
  CrmConnectionId,
  CrmCreateConnectionInput,
  CrmProviderConnection,
  CrmWhatsappZapiAddonContract,
} from "./crmConversationTypes";

const fallbackAllowance: CrmConnectionAllowance = {
  limit: 0,
  remaining: 0,
  used: 0,
};

export function useCrmConnections(api: CrmConversationApi) {
  const [allowance, setAllowance] = useState(fallbackAllowance);
  const [availableSetups, setAvailableSetups] = useState<CrmAvailableSetup[]>(
    [],
  );
  const [connections, setConnections] = useState<CrmProviderConnection[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zapiAddonContract, setZapiAddonContract] =
    useState<CrmWhatsappZapiAddonContract | null>(null);
  const requestGenerationRef = useRef(0);

  const loadConnections = useCallback(() => api.listConnections(), [api]);
  const loadZapiAddonContract = useCallback(async () => {
    if (!api.getZapiAddonContract) return null;
    try {
      return await api.getZapiAddonContract();
    } catch {
      // Billing is an enrichment for the connection screen. A billing read
      // failure must not hide an otherwise usable CRM connection list.
      return null;
    }
  }, [api]);

  const refreshConnections = useCallback(async () => {
    const requestGeneration = ++requestGenerationRef.current;
    try {
      const [payload, addonContract] = await Promise.all([
        loadConnections(),
        loadZapiAddonContract(),
      ]);
      if (requestGeneration !== requestGenerationRef.current) return;
      setConnections(payload.connections);
      setAllowance(payload.allowance);
      setAvailableSetups(payload.availableSetups);
      setZapiAddonContract(addonContract);
    } catch (caught) {
      if (requestGeneration === requestGenerationRef.current) {
        setError(asError(caught));
      }
    }
  }, [loadConnections, loadZapiAddonContract]);

  const createConnection = useCallback(
    async (input: CrmCreateConnectionInput) => {
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
    async (connectionId: CrmConnectionId) => {
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
    async (connectionId: CrmConnectionId, phone: string) => {
      try {
        return await api.requestZapiPairingCode(connectionId, phone);
      } catch (caught) {
        setError(asError(caught));
        throw caught;
      }
    },
    [api],
  );

  const disconnectZapiConnection = useCallback(
    async (connectionId: CrmConnectionId) => {
      try {
        const connection = await api.disconnectZapiConnection(connectionId);
        await refreshConnections();
        return connection;
      } catch (caught) {
        setError(asError(caught));
        throw caught;
      }
    },
    [api, refreshConnections],
  );

  const refreshZapiConnectionStatus = useCallback(
    async (connectionId: CrmConnectionId) => {
      try {
        const connection = await api.refreshZapiConnectionStatus(connectionId);
        await refreshConnections();
        return connection;
      } catch (caught) {
        setError(asError(caught));
        throw caught;
      }
    },
    [api, refreshConnections],
  );

  const requestZapiAddon = useCallback(async () => {
    if (!api.requestZapiAddon) {
      throw new Error("A solicitação da Z-API não está disponível.");
    }
    try {
      const contract = await api.requestZapiAddon();
      setZapiAddonContract(contract);
      return contract;
    } catch (caught) {
      setError(asError(caught));
      throw caught;
    }
  }, [api]);

  const setConnectionPaused = useCallback(
    async (connectionId: CrmConnectionId, paused: boolean) => {
      if (!api.setConnectionPaused) {
        throw new Error("O gerenciamento desta conexão não está disponível.");
      }
      try {
        await api.setConnectionPaused(connectionId, paused);
        await refreshConnections();
      } catch (caught) {
        setError(asError(caught));
        throw caught;
      }
    },
    [api, refreshConnections],
  );

  const configureZapiWebhooks = useCallback(
    async (connectionId: CrmConnectionId) => {
      try {
        const result = await api.configureZapiWebhooks(connectionId);
        const payload = await loadConnections();
        const configuredConnections = payload.connections.map((connection) =>
          connection.id === connectionId && connection.setup === undefined
            ? { ...connection, setup: result.setup }
            : connection,
        );
        setConnections(configuredConnections);
        setAllowance(payload.allowance);
        setAvailableSetups(payload.availableSetups);
        const connection = configuredConnections.find(
          (candidate) => candidate.id === connectionId,
        );
        return {
          ...result,
          ...(connection ? { connection } : {}),
        };
      } catch (caught) {
        setError(asError(caught));
        throw caught;
      }
    },
    [api, loadConnections],
  );

  const authorizeComposio = useCallback(
    (connectionId: CrmConnectionId) =>
      api.authorizeComposioConnection(connectionId),
    [api],
  );

  const completeComposio = useCallback(
    async (
      connectionId: CrmConnectionId,
    ): Promise<CrmComposioCompleteResult> => {
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
    async (connectionId: CrmConnectionId, senderId: string) => {
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

  useEffect(() => {
    const requestGeneration = ++requestGenerationRef.current;
    let active = true;
    setIsLoading(true);
    setError(null);
    void loadConnections()
      .then(async (payload) => {
        if (active && requestGeneration === requestGenerationRef.current) {
          setConnections(payload.connections);
          setAllowance(payload.allowance);
          setAvailableSetups(payload.availableSetups);
          setZapiAddonContract(await loadZapiAddonContract());
        }
      })
      .catch((caught) => {
        if (active && requestGeneration === requestGenerationRef.current)
          setError(asError(caught));
      })
      .finally(() => {
        if (active && requestGeneration === requestGenerationRef.current)
          setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadConnections, loadZapiAddonContract]);

  return {
    allowance,
    authorizeComposio,
    availableSetups,
    completeComposio,
    configureZapiWebhooks,
    connections,
    createConnection,
    disconnectZapiConnection,
    error,
    hasConnectedConnection: connections.some(
      (connection) => connection.readiness?.ready === true,
    ),
    isLoading,
    refreshConnections,
    requestZapiPairingCode,
    requestZapiPairingQr,
    requestZapiAddon,
    refreshZapiConnectionStatus,
    selectComposioSender,
    setConnectionPaused,
    zapiAddonContract,
  };
}
