import { Landmark, PlugZap, RefreshCw, Unplug } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
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
  const mappedStoreCount = mappingsByStore.size;

  return (
    <FeaturePageShell className="credere-shell" variant="content">
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
        chip={connection?.connected ? "Conta Credere conectada" : undefined}
        description="Conecte uma conta Credere e defina, loja por loja, onde as simulações da rede serão processadas."
        eyebrow={
          <>
            <Landmark aria-hidden="true" className="size-4" />
            Financiamento da rede
          </>
        }
        title="Integração Credere"
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
          <section
            aria-label="Resumo da conexão Credere"
            className="credere-network-summary"
          >
            <div>
              <span>Conta do provedor</span>
              <strong>Conectada</strong>
            </div>
            <div>
              <span>Lojas vinculadas</span>
              <strong>
                {mappedStoreCount} de {stores.length}
              </strong>
            </div>
            <p>
              Lojas sem vínculo permanecem bloqueadas para simulações oficiais.
            </p>
          </section>
          <FeatureSection
            className="credere-mapping-workspace"
            description="Cada loja local precisa ser vinculada explicitamente a uma loja do provedor. Lojas sem mapeamento não conseguem simular."
            padding="none"
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
              <ul className="credere-mapping-list">
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
    </FeaturePageShell>
  );
}
