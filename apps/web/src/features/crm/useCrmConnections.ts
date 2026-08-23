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
  CrmWhatsappZapiWebhookSetupResult,
  CrmZapiCredentialsInput,
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
  const connectionsRef = useRef<CrmProviderConnection[]>([]);
  const connectionMutationGenerationRef = useRef(new Map<string, number>());
  const preserveNextOperationalSnapshotRef = useRef(new Set<string>());

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

  const applyConnectionsPayload = useCallback(
    (payload: Awaited<ReturnType<CrmConversationApi["listConnections"]>>) => {
      const nextConnections = payload.connections.map((incoming) => {
        const connectionId = String(incoming.id);
        const current = connectionsRef.current.find(
          (candidate) => String(candidate.id) === connectionId,
        );
        const reconciled = current
          ? reconcileConnectionSnapshot(current, incoming)
          : incoming;
        if (
          !current ||
          !preserveNextOperationalSnapshotRef.current.has(connectionId)
        ) {
          return reconciled;
        }
        preserveNextOperationalSnapshotRef.current.delete(connectionId);
        return preserveConnectionOperationalState(current, reconciled);
      });
      connectionsRef.current = nextConnections;
      setConnections(nextConnections);
      setAllowance(payload.allowance);
      setAvailableSetups(payload.availableSetups);
      setError(null);
    },
    [],
  );

  const beginConnectionMutation = useCallback(
    (connectionId: CrmConnectionId) => {
      const key = String(connectionId);
      const next = (connectionMutationGenerationRef.current.get(key) ?? 0) + 1;
      connectionMutationGenerationRef.current.set(key, next);
      return next;
    },
    [],
  );

  const isLatestConnectionMutation = useCallback(
    (connectionId: CrmConnectionId, generation: number) =>
      connectionMutationGenerationRef.current.get(String(connectionId)) ===
      generation,
    [],
  );

  const reconcileConnection = useCallback(
    (connectionId: CrmConnectionId, incoming: CrmProviderConnection) => {
      const current = connectionsRef.current.find(
        (candidate) => String(candidate.id) === String(connectionId),
      );
      const reconciled = current
        ? reconcileConnectionSnapshot(current, incoming)
        : incoming;
      const nextConnections = current
        ? connectionsRef.current.map((candidate) =>
            String(candidate.id) === String(connectionId)
              ? reconciled
              : candidate,
          )
        : connectionsRef.current;
      if (current) {
        connectionsRef.current = nextConnections;
        setConnections(nextConnections);
      }
      return reconciled;
    },
    [],
  );

  const refreshConnections = useCallback(async () => {
    const requestGeneration = ++requestGenerationRef.current;
    try {
      const [payload, addonContract] = await Promise.all([
        loadConnections(),
        loadZapiAddonContract(),
      ]);
      if (requestGeneration !== requestGenerationRef.current) return;
      applyConnectionsPayload(payload);
      setZapiAddonContract(addonContract);
    } catch (caught) {
      if (requestGeneration === requestGenerationRef.current) {
        setError(asError(caught));
      }
    }
  }, [applyConnectionsPayload, loadConnections, loadZapiAddonContract]);

  const createConnection = useCallback(
    async (input: CrmCreateConnectionInput) => {
      try {
        const created = await api.createConnection(input);
        void refreshConnections();
        return created;
      } catch (caught) {
        setError(asError(caught));
        throw caught;
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
      const mutationGeneration = beginConnectionMutation(connectionId);
      try {
        const connection = await api.disconnectZapiConnection(connectionId);
        await refreshConnections();
        if (!isLatestConnectionMutation(connectionId, mutationGeneration)) {
          return (
            connectionsRef.current.find(
              (candidate) => String(candidate.id) === String(connectionId),
            ) ?? connection
          );
        }
        return reconcileConnection(connectionId, connection);
      } catch (caught) {
        setError(asError(caught));
        throw caught;
      }
    },
    [
      api,
      beginConnectionMutation,
      isLatestConnectionMutation,
      reconcileConnection,
      refreshConnections,
    ],
  );

  const repairZapiConnectionCredentials = useCallback(
    async (connectionId: CrmConnectionId, input: CrmZapiCredentialsInput) => {
      const mutationGeneration = beginConnectionMutation(connectionId);
      try {
        const connection = await api.repairZapiConnectionCredentials(
          connectionId,
          input,
        );
        if (!isLatestConnectionMutation(connectionId, mutationGeneration)) {
          return (
            connectionsRef.current.find(
              (candidate) => String(candidate.id) === String(connectionId),
            ) ?? connection
          );
        }
        const reconciled = reconcileConnection(connectionId, connection);
        preserveNextOperationalSnapshotRef.current.add(String(connection.id));
        await refreshConnections();
        return (
          connectionsRef.current.find(
            (candidate) => String(candidate.id) === String(connection.id),
          ) ?? reconciled
        );
      } catch (caught) {
        setError(asError(caught));
        throw caught;
      }
    },
    [
      api,
      beginConnectionMutation,
      isLatestConnectionMutation,
      reconcileConnection,
      refreshConnections,
    ],
  );

  const refreshZapiConnectionStatus = useCallback(
    async (connectionId: CrmConnectionId) => {
      const mutationGeneration = beginConnectionMutation(connectionId);
      try {
        const connection = await api.refreshZapiConnectionStatus(connectionId);
        await refreshConnections();
        if (!isLatestConnectionMutation(connectionId, mutationGeneration)) {
          return (
            connectionsRef.current.find(
              (candidate) => String(candidate.id) === String(connectionId),
            ) ?? connection
          );
        }
        return reconcileConnection(connectionId, connection);
      } catch (caught) {
        setError(asError(caught));
        throw caught;
      }
    },
    [
      api,
      beginConnectionMutation,
      isLatestConnectionMutation,
      reconcileConnection,
      refreshConnections,
    ],
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
    async (
      connectionId: CrmConnectionId,
    ): Promise<
      CrmWhatsappZapiWebhookSetupResult & {
        connection?: CrmProviderConnection;
      }
    > => {
      const mutationGeneration = beginConnectionMutation(connectionId);
      try {
        const result = await api.configureZapiWebhooks(connectionId);
        await refreshConnections();
        if (!isLatestConnectionMutation(connectionId, mutationGeneration)) {
          return result;
        }
        const currentConnections = connectionsRef.current;
        const current = currentConnections.find(
          (candidate) => String(candidate.id) === String(connectionId),
        );
        const connection = current
          ? { ...current, setup: result.setup }
          : undefined;
        if (connection) {
          const configuredConnections = currentConnections.map((candidate) =>
            String(candidate.id) === String(connectionId)
              ? connection
              : candidate,
          );
          connectionsRef.current = configuredConnections;
          setConnections(configuredConnections);
        }
        return {
          ...result,
          ...(connection ? { connection } : {}),
        };
      } catch (caught) {
        setError(asError(caught));
        throw caught;
      }
    },
    [
      api,
      beginConnectionMutation,
      isLatestConnectionMutation,
      refreshConnections,
    ],
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
        connectionsRef.current = connectionsRef.current.map((connection) =>
          connection.id === result.connection.id
            ? result.connection
            : connection,
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
    connectionsRef.current = [];
    setConnections([]);
    setAllowance(fallbackAllowance);
    setAvailableSetups([]);
    setZapiAddonContract(null);
    setIsLoading(true);
    setError(null);
    void Promise.all([loadConnections(), loadZapiAddonContract()])
      .then(([payload, addonContract]) => {
        if (active && requestGeneration === requestGenerationRef.current) {
          applyConnectionsPayload(payload);
          setZapiAddonContract(addonContract);
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
  }, [applyConnectionsPayload, loadConnections, loadZapiAddonContract]);

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
    repairZapiConnectionCredentials,
    requestZapiPairingCode,
    requestZapiPairingQr,
    requestZapiAddon,
    refreshZapiConnectionStatus,
    selectComposioSender,
    setConnectionPaused,
    zapiAddonContract,
  };
}

function reconcileConnectionSnapshot(
  current: CrmProviderConnection,
  incoming: CrmProviderConnection,
): CrmProviderConnection {
  const currentLiveAt = readTimestamp(current.live?.checkedAt);
  const incomingLiveAt = readTimestamp(incoming.live?.checkedAt);
  const currentSetupAt = readTimestamp(current.setup?.updatedAt);
  const incomingSetupAt = readTimestamp(incoming.setup?.updatedAt);

  return {
    ...current,
    ...incoming,
    ...(current.live && (!incoming.live || incomingLiveAt < currentLiveAt)
      ? { live: current.live }
      : {}),
    ...(current.setup && (!incoming.setup || incomingSetupAt < currentSetupAt)
      ? { setup: current.setup }
      : {}),
  };
}

function preserveConnectionOperationalState(
  current: CrmProviderConnection,
  incoming: CrmProviderConnection,
): CrmProviderConnection {
  return {
    ...incoming,
    ...(current.credentials ? { credentials: current.credentials } : {}),
    ...(current.live ? { live: current.live } : {}),
    ...(current.readiness ? { readiness: current.readiness } : {}),
    ...(current.ready !== undefined ? { ready: current.ready } : {}),
    ...(current.setup ? { setup: current.setup } : {}),
    ...(current.state ? { state: current.state } : {}),
    ...(current.status ? { status: current.status } : {}),
  };
}

function readTimestamp(value: string | null | undefined) {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
