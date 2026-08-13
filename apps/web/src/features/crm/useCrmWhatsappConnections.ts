import { useCallback, useEffect, useRef, useState } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { asError } from "./crmWhatsappHookSupport";
import type {
  CrmWhatsappComposioCompleteResult,
  CrmWhatsappConnectionAllowance,
  CrmWhatsappConnectionId,
  CrmWhatsappCreateConnectionInput,
  CrmWhatsappProviderConnection,
  CrmWhatsappSetupProvider,
  CrmWhatsappZapiAddonContract,
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
      setAvailableProviders(payload.availableProviders);
      setZapiAddonContract(addonContract);
    } catch (caught) {
      if (requestGeneration === requestGenerationRef.current) {
        setError(asError(caught));
      }
    }
  }, [loadConnections, loadZapiAddonContract]);

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

  const disconnectZapiConnection = useCallback(
    async (connectionId: CrmWhatsappConnectionId) => {
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
    async (connectionId: CrmWhatsappConnectionId) => {
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
    async (connectionId: CrmWhatsappConnectionId, paused: boolean) => {
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
    async (connectionId: CrmWhatsappConnectionId) => {
      try {
        const result = await api.configureZapiWebhooks(connectionId);
        const payload = await loadConnections();
        setConnections(payload.connections);
        setAllowance(payload.allowance);
        setAvailableProviders(payload.availableProviders);
        const connection = payload.connections.find(
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
          setAvailableProviders(payload.availableProviders);
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
    availableProviders,
    completeComposio,
    configureZapiWebhooks,
    connections,
    createConnection,
    disconnectZapiConnection,
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
    requestZapiAddon,
    refreshZapiConnectionStatus,
    selectComposioSender,
    setConnectionPaused,
    zapiAddonContract,
  };
}
