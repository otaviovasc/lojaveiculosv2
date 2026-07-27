import { useCallback, useEffect, useMemo, useState } from "react";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import { useAccountSession } from "../../account/accountSession";
import {
  createRuntimeActorAuth,
  createRuntimeFetch,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../../account/runtimeAuth";
import { createAgencyApi, type AgencyManagedStoreOverview } from "../apiClient";
import {
  createAgencyCredereApi,
  type AgencyCredereApi,
  type AgencyCredereConnection,
  type AgencyCredereProviderStore,
} from "../credereApiClient";

type AgencyCredereApis = {
  agency: ReturnType<typeof createAgencyApi>;
  credere: AgencyCredereApi;
};

export type AgencyCredereApiFactory = () => Promise<AgencyCredereApis>;

export function useAgencyCrederePageState(
  apiFactory?: AgencyCredereApiFactory,
) {
  const session = useAccountSession();
  const agencyTenant = session.tenantMemberships.find(
    (membership) =>
      membership.role === "agency" && membership.status === "active",
  );
  const apisPromise = useMemo(
    () => apiFactory?.() ?? createRuntimeApis(),
    [apiFactory],
  );
  const [stores, setStores] = useState<readonly AgencyManagedStoreOverview[]>(
    [],
  );
  const [connection, setConnection] = useState<AgencyCredereConnection | null>(
    null,
  );
  const [providerStores, setProviderStores] = useState<
    readonly AgencyCredereProviderStore[] | null
  >(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!agencyTenant) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { agency, credere } = await apisPromise;
      const [overview, nextConnection] = await Promise.all([
        agency.getOverview(agencyTenant.tenantId),
        credere.getConnection(agencyTenant.tenantId),
      ]);
      setStores(overview.stores);
      setConnection(nextConnection);
    } catch (caught) {
      setError(
        formatApiErrorDisplay(
          caught,
          "Não foi possível carregar a integração Credere.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [agencyTenant, apisPromise]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!agencyTenant || !connection?.connected) return;
    let cancelled = false;
    void (async () => {
      try {
        const { credere } = await apisPromise;
        const list = await credere.listProviderStores(agencyTenant.tenantId);
        if (!cancelled) setProviderStores(list);
      } catch (caught) {
        if (!cancelled) {
          setActionError(
            formatApiErrorDisplay(
              caught,
              "Não foi possível listar as lojas do provedor.",
            ),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agencyTenant, apisPromise, connection?.connected]);

  const runAction = async (key: string, action: () => Promise<void>) => {
    if (busyKey) return;
    setBusyKey(key);
    setActionError(null);
    try {
      await action();
    } catch (caught) {
      setActionError(
        formatApiErrorDisplay(caught, "Não foi possível concluir a ação."),
      );
    } finally {
      setBusyKey(null);
    }
  };

  const startOAuth = () =>
    runAction("oauth", async () => {
      if (!agencyTenant) return;
      const { credere } = await apisPromise;
      const { authorizationUrl } = await credere.startOAuth(
        agencyTenant.tenantId,
      );
      window.location.assign(authorizationUrl);
    });

  const disconnect = () =>
    runAction("disconnect", async () => {
      if (!agencyTenant) return;
      const { credere } = await apisPromise;
      await credere.disconnect(agencyTenant.tenantId);
      setProviderStores(null);
      await load();
    });

  const saveMapping = (storeId: string) =>
    runAction(`map:${storeId}`, async () => {
      const externalStoreId = selections[storeId];
      if (!agencyTenant || !externalStoreId) return;
      const { credere } = await apisPromise;
      await credere.mapStore(agencyTenant.tenantId, storeId, externalStoreId);
      await load();
    });

  const removeMapping = (storeId: string) =>
    runAction(`unmap:${storeId}`, async () => {
      if (!agencyTenant) return;
      const { credere } = await apisPromise;
      await credere.unmapStore(agencyTenant.tenantId, storeId);
      await load();
    });

  return {
    actionError,
    agencyTenant,
    busyKey,
    connection,
    disconnect,
    error,
    load,
    loading,
    providerStores,
    removeMapping,
    saveMapping,
    selections,
    setSelections,
    startOAuth,
    stores,
  };
}

async function createRuntimeApis(): Promise<AgencyCredereApis> {
  const token = await readClerkToken();
  const auth = createRuntimeActorAuth(token);
  const runtimeFetch = createRuntimeFetch();
  const baseUrl = readRuntimeApiBaseUrl();
  return {
    agency: createAgencyApi({ auth, fetch: runtimeFetch, ...baseUrl }),
    credere: createAgencyCredereApi({
      auth,
      fetch: runtimeFetch,
      ...baseUrl,
    }),
  };
}
