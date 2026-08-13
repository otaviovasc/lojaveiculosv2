import {
  Landmark,
  Link2,
  Link2Off,
  PlugZap,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import "../../styles/credere-panels.css";
import { Badge } from "../../components/ui/badge";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import {
  FeatureAlert,
  FeatureLoadingState,
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
    <section className="credere-owner-panel">
      {actionError ? (
        <FeatureAlert tone="danger">{actionError}</FeatureAlert>
      ) : null}

      <div className="credere-owner-header">
        <div className="credere-owner-title-group">
          <div className="credere-owner-icon-box">
            <Landmark aria-hidden="true" className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="credere-owner-title">Credere da loja</h2>
              {connection ? (
                <Badge variant={connection.connected ? "success" : "warning"}>
                  {connection.connected ? "Conectada" : "Não conectada"}
                </Badge>
              ) : null}
            </div>
            <p className="credere-owner-subtitle">
              Conexão e vínculo oficial para processamento de simulações.
            </p>
          </div>
        </div>

        <div className="credere-owner-top-actions">
          <FeatureActionButton
            icon={RefreshCw}
            isBusy={connectionState.kind === "loading"}
            label="Atualizar conexão Credere"
            onClick={() => void loadConnection()}
          />
        </div>
      </div>

      {connectionState.kind === "loading" ? (
        <FeatureLoadingState
          density="compact"
          title="Consultando conexão Credere"
        />
      ) : connectionState.kind === "error" ? (
        <FeatureAlert title="Conexão indisponível" tone="danger">
          {connectionState.message}
        </FeatureAlert>
      ) : connection ? (
        <div className="credere-owner-body">
          <div className="credere-owner-summary-bar">
            <div className="credere-owner-fact">
              <span>Status da conta</span>
              <strong>
                {connection.connected
                  ? "Autenticada via OAuth"
                  : "Pendente de login"}
              </strong>
            </div>
            <div className="credere-owner-fact">
              <span>Loja vinculada</span>
              <strong className="text-accent-strong">
                {connection.storeMapping?.externalStoreAlias ||
                  (connection.storeMapping ? "Loja Credere" : "Nenhuma")}
              </strong>
            </div>
            <div className="credere-owner-fact">
              <span>Ambiente</span>
              <strong>Credere Oficial (Produção/Homologação)</strong>
            </div>
          </div>

          <div className="credere-owner-actions-row">
            {!connection.connected ? (
              <FeatureActionButton
                icon={PlugZap}
                isBusy={busyAction === "oauth"}
                label="Conectar Credere"
                onClick={() => void startOAuth()}
                variant="primary"
              />
            ) : (
              <>
                <FeatureActionButton
                  disabled={busyAction !== null}
                  icon={Link2}
                  isBusy={busyAction === "provider-stores"}
                  label="Listar lojas Credere"
                  onClick={() => void loadProviderStores()}
                />
                <FeatureActionButton
                  disabled={!connection.storeMapping || busyAction !== null}
                  icon={Link2Off}
                  isBusy={busyAction === "unmap"}
                  label="Remover vínculo Credere"
                  onClick={() => setConfirmAction("unmap")}
                />
                <FeatureActionButton
                  disabled={busyAction !== null}
                  icon={Unplug}
                  isBusy={busyAction === "disconnect"}
                  label="Desconectar Credere"
                  onClick={() => setConfirmAction("disconnect")}
                />
              </>
            )}
          </div>

          {providers ? (
            providers.length === 0 ? (
              <FeatureAlert title="Nenhuma loja no provedor" tone="warning">
                A conta conectada não retornou lojas Credere. Verifique o
                cadastro no provedor antes de vincular.
              </FeatureAlert>
            ) : (
              <div className="credere-owner-mapping-box">
                <StoreSelector
                  onChange={setSelectedExternalStoreId}
                  stores={providers}
                  value={selectedExternalStoreId}
                />
                <FeatureActionButton
                  disabled={!selectedExternalStoreId || busyAction !== null}
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
            )
          ) : null}
        </div>
      ) : null}

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
    </section>
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
    <label className="credere-owner-store-selector">
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
