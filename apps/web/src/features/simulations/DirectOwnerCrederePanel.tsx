import { Link2, Link2Off, PlugZap, RefreshCw, Unplug } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import {
  FeatureActionButton,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import {
  FeatureAlert,
  FeatureLoadingState,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { CredereApi } from "./apiClient";
import type { CredereConnectionSummary, CredereProviderStore } from "./types";

type ConnectionState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { connection: CredereConnectionSummary; kind: "ready" };

export function DirectOwnerCrederePanel({
  apiPromise,
  onChanged,
}: {
  apiPromise: Promise<CredereApi>;
  onChanged: () => void;
}) {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    kind: "loading",
  });
  const [providers, setProviders] = useState<CredereProviderStore[] | null>(
    null,
  );
  const [selectedExternalStoreId, setSelectedExternalStoreId] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    "disconnect" | "unmap" | null
  >(null);

  const loadConnection = useCallback(async () => {
    setConnectionState({ kind: "loading" });
    try {
      const api = await apiPromise;
      setConnectionState({
        connection: await api.getConnection(),
        kind: "ready",
      });
    } catch (error) {
      setConnectionState({
        kind: "error",
        message: formatApiErrorDisplay(
          error,
          "Não foi possível carregar a conexão Credere.",
        ),
      });
    }
  }, [apiPromise]);

  useEffect(() => {
    void loadConnection();
  }, [loadConnection]);

  const runAction = async (
    name: string,
    action: (api: CredereApi) => unknown,
  ) => {
    setActionError(null);
    setBusyAction(name);
    try {
      const api = await apiPromise;
      await action(api);
      await loadConnection();
      onChanged();
    } catch (error) {
      setActionError(
        formatApiErrorDisplay(error, "Não foi possível concluir a ação."),
      );
    } finally {
      setBusyAction(null);
    }
  };

  const loadProviderStores = async () => {
    setActionError(null);
    setBusyAction("provider-stores");
    try {
      const api = await apiPromise;
      const stores = await api.listProviderStores();
      setProviders(stores);
      setSelectedExternalStoreId(
        (current) => current || stores[0]?.externalStoreId || "",
      );
    } catch (error) {
      setActionError(
        formatApiErrorDisplay(
          error,
          "Não foi possível listar as lojas Credere.",
        ),
      );
    } finally {
      setBusyAction(null);
    }
  };

  const startOAuth = async () => {
    setActionError(null);
    setBusyAction("oauth");
    try {
      const api = await apiPromise;
      const next = await api.startOAuth();
      if (next.authorizationUrl) window.location.assign(next.authorizationUrl);
    } catch (error) {
      setActionError(
        formatApiErrorDisplay(
          error,
          "Não foi possível iniciar a conexão Credere.",
        ),
      );
    } finally {
      setBusyAction(null);
    }
  };

  const connection =
    connectionState.kind === "ready" ? connectionState.connection : null;

  return (
    <>
      <FeatureSection
        className="credere-connection"
        actions={
          <FeatureActionButton
            icon={RefreshCw}
            isBusy={connectionState.kind === "loading"}
            label="Atualizar conexão Credere"
            onClick={() => void loadConnection()}
          />
        }
        description="A conexão e o vínculo definem onde as simulações oficiais desta loja são processadas."
        padding="compact"
        title="Credere da loja"
      >
        {actionError ? (
          <FeatureAlert tone="danger">{actionError}</FeatureAlert>
        ) : null}
        <div className="credere-connection-body">
          <div className="credere-connection-summary">
            {connectionState.kind === "loading" ? (
              <FeatureLoadingState
                density="compact"
                title="Consultando conexão"
              />
            ) : null}
            {connectionState.kind === "error" ? (
              <FeatureAlert title="Conexão indisponível" tone="danger">
                {connectionState.message}
              </FeatureAlert>
            ) : null}
            {connection ? (
              <>
                <div className="credere-connection-fact">
                  <span>Status da conta</span>
                  <FeatureStatusBadge
                    size="dense"
                    tone={connection.connected ? "success" : "warning"}
                  >
                    {connection.connected ? "Conectada" : "Não conectada"}
                  </FeatureStatusBadge>
                </div>
                <div className="credere-connection-fact">
                  <span>Loja vinculada</span>
                  <strong>
                    {connection.storeMapping?.externalStoreAlias ||
                      (connection.storeMapping ? "Loja Credere" : "Nenhuma")}
                  </strong>
                </div>
              </>
            ) : null}
          </div>

          <div className="credere-connection-actions">
            {!connection?.connected ? (
              <FeatureActionButton
                icon={PlugZap}
                isBusy={busyAction === "oauth"}
                label="Conectar Credere"
                onClick={() => void startOAuth()}
                variant="primary"
              />
            ) : (
              <>
                <div className="credere-mapping-actions">
                  <FeatureActionButton
                    icon={Link2}
                    isBusy={busyAction === "provider-stores"}
                    label="Listar lojas Credere"
                    onClick={() => void loadProviderStores()}
                  />
                  <FeatureActionButton
                    disabled={!connection.storeMapping}
                    icon={Link2Off}
                    isBusy={busyAction === "unmap"}
                    label="Remover vínculo Credere"
                    onClick={() => setConfirmAction("unmap")}
                  />
                  <FeatureActionButton
                    icon={Unplug}
                    isBusy={busyAction === "disconnect"}
                    label="Desconectar Credere"
                    onClick={() => setConfirmAction("disconnect")}
                  />
                </div>
                {providers ? (
                  <div className="credere-store-mapping-control">
                    <StoreSelector
                      onChange={setSelectedExternalStoreId}
                      stores={providers}
                      value={selectedExternalStoreId}
                    />
                    <FeatureActionButton
                      disabled={!selectedExternalStoreId}
                      icon={Link2}
                      isBusy={busyAction === "map"}
                      label="Vincular loja Credere"
                      onClick={() =>
                        void runAction("map", (api) =>
                          api.mapStore(selectedExternalStoreId),
                        )
                      }
                      variant="primary"
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </FeatureSection>
      <ConfirmDialog
        confirmLabel={
          confirmAction === "disconnect" ? "Desconectar" : "Remover vínculo"
        }
        description={
          confirmAction === "disconnect"
            ? "A loja não poderá realizar simulações oficiais até uma nova conexão e um novo vínculo."
            : "A loja não poderá realizar simulações oficiais até ser vinculada novamente."
        }
        isLoading={busyAction === confirmAction}
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={async () => {
          const action = confirmAction;
          if (action === "unmap") {
            await runAction("unmap", (api) => api.unmapStore());
          } else if (action === "disconnect") {
            await runAction("disconnect", (api) => api.disconnectConnection());
          }
          setConfirmAction(null);
        }}
        title={
          confirmAction === "disconnect"
            ? "Desconectar a conta Credere?"
            : "Remover o vínculo com a loja Credere?"
        }
        variant="destructive"
      />
    </>
  );
}

function StoreSelector({
  onChange,
  stores,
  value,
}: {
  onChange: (value: string) => void;
  stores: CredereProviderStore[];
  value: string;
}) {
  return (
    <label className="credere-store-selector">
      <span>Loja Credere</span>
      <FeatureSelect
        ariaLabel="Loja Credere"
        onChange={onChange}
        options={stores.map((store) => ({
          label: store.name || store.alias || "Loja Credere sem nome",
          value: store.externalStoreId,
        }))}
        placeholder="Selecione uma loja Credere"
        value={value}
      />
    </label>
  );
}
