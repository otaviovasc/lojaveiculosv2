import { PlugZap, RefreshCw, Unplug } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeatureSection,
} from "../../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../../components/ui/FeatureStates";
import { AgencyCredereMappingRow } from "./AgencyCredereMappingRow";
import {
  useAgencyCrederePageState,
  type AgencyCredereApiFactory,
} from "./useAgencyCrederePageState";

export function AgencyCrederePage({
  apiFactory,
}: {
  apiFactory?: AgencyCredereApiFactory;
} = {}) {
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const state = useAgencyCrederePageState(apiFactory);
  const {
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
  } = state;

  const mappingsByStore = new Map(
    (connection?.mappings ?? [])
      .filter((mapping) => mapping.externalStoreId)
      .map((mapping) => [mapping.storeId, mapping]),
  );

  return (
    <div className="content-frame animate-fade-in">
      <FeaturePageHeader
        actions={
          connection?.connected ? (
            <>
              <FeatureActionButton
                disabled={busyKey !== null}
                icon={RefreshCw}
                label="Reconectar"
                onClick={() => void startOAuth()}
              />
              <FeatureActionButton
                disabled={busyKey !== null}
                icon={Unplug}
                label="Desconectar"
                onClick={() => setDisconnectOpen(true)}
              />
            </>
          ) : undefined
        }
        chip={
          connection?.connected
            ? (connection.connectionStatus ?? "Conta Credere conectada")
            : undefined
        }
        description="Conexão OAuth da agência com o Credere e mapeamento explícito de cada loja afiliada."
        eyebrow="Agência"
        title="Credere"
      />

      {!agencyTenant ? (
        <FeatureAlert title="Acesso restrito" tone="info">
          Esta área é exclusiva de contas de agência.
        </FeatureAlert>
      ) : loading ? (
        <FeatureLoadingState title="Carregando integração Credere" />
      ) : error ? (
        <FeatureAlert
          action={
            <FeatureActionButton
              icon={RefreshCw}
              label="Tentar novamente"
              onClick={() => void load()}
            />
          }
          title="Integração indisponível"
          tone="danger"
        >
          {error}
        </FeatureAlert>
      ) : !connection?.connected ? (
        <FeatureEmptyState
          action={
            <FeatureActionButton
              disabled={busyKey !== null}
              icon={PlugZap}
              isBusy={busyKey === "oauth"}
              label="Conectar Credere"
              onClick={() => void startOAuth()}
              variant="primary"
            />
          }
          body="Conecte a conta Credere da agência via OAuth para habilitar simulações de financiamento nas lojas afiliadas. Nenhuma simulação oficial ocorre antes da conexão."
          icon={PlugZap}
          title="Credere não conectado"
          tone="warning"
        />
      ) : (
        <>
          {actionError ? (
            <FeatureAlert tone="danger">{actionError}</FeatureAlert>
          ) : null}
          <FeatureSection
            description="Cada loja local precisa ser vinculada explicitamente a uma loja do provedor. Lojas sem mapeamento não conseguem simular."
            title="Mapeamento de lojas"
          >
            {providerStores === null ? (
              <FeatureLoadingState
                density="compact"
                title="Carregando lojas do provedor"
              />
            ) : providerStores.length === 0 ? (
              <FeatureAlert title="Nenhuma loja no provedor" tone="warning">
                A conta conectada não retornou lojas Credere. Verifique o
                cadastro no provedor antes de mapear.
              </FeatureAlert>
            ) : stores.length === 0 ? (
              <p className="text-sm font-semibold text-muted">
                Nenhuma loja afiliada nesta agência.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {stores.map((store) => (
                  <AgencyCredereMappingRow
                    busyKey={busyKey}
                    key={store.storeId}
                    mapping={mappingsByStore.get(store.storeId) ?? null}
                    onRemove={() => void removeMapping(store.storeId)}
                    onSave={() => void saveMapping(store.storeId)}
                    onSelect={(value) =>
                      setSelections((previous) => ({
                        ...previous,
                        [store.storeId]: value,
                      }))
                    }
                    providerStores={providerStores}
                    selection={selections[store.storeId] ?? ""}
                    store={store}
                  />
                ))}
              </ul>
            )}
          </FeatureSection>
        </>
      )}
      <ConfirmDialog
        confirmLabel="Desconectar"
        description="Os mapeamentos das lojas afiliadas deixarão de funcionar até uma nova conexão Credere."
        isLoading={busyKey === "disconnect"}
        isOpen={disconnectOpen}
        onClose={() => setDisconnectOpen(false)}
        onConfirm={async () => {
          await disconnect();
          setDisconnectOpen(false);
        }}
        title="Desconectar a conta Credere da agência?"
        variant="destructive"
      />
    </div>
  );
}
