import { Link2Off } from "lucide-react";
import { FeatureActionButton } from "../../../components/ui/FeatureLayout";
import { FeatureStatusBadge } from "../../../components/ui/FeatureStates";
import { FeatureSelect } from "../../../components/ui/FeatureControls";
import type { AgencyManagedStoreOverview } from "../apiClient";
import type {
  AgencyCredereProviderStore,
  AgencyCredereStoreMapping,
} from "../credereApiClient";

export function AgencyCredereMappingRow({
  busyKey,
  mapping,
  onRemove,
  onSave,
  onSelect,
  providerStores,
  selection,
  store,
}: {
  busyKey: string | null;
  mapping: AgencyCredereStoreMapping | null;
  onRemove: () => void;
  onSave: () => void;
  onSelect: (value: string) => void;
  providerStores: readonly AgencyCredereProviderStore[];
  selection: string;
  store: AgencyManagedStoreOverview;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line bg-app p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-bold text-app-text">
          {store.storeName}
        </span>
        {mapping ? (
          <FeatureStatusBadge size="dense" tone="success">
            Mapeada
          </FeatureStatusBadge>
        ) : (
          <FeatureStatusBadge size="dense" tone="warning">
            Não mapeada
          </FeatureStatusBadge>
        )}
      </div>
      {mapping ? (
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-muted">
            {mapping.externalStoreAlias ?? "Loja do provedor"} · ID externo{" "}
            {mapping.externalStoreId}
          </span>
          <FeatureActionButton
            disabled={busyKey !== null}
            icon={Link2Off}
            isBusy={busyKey === `unmap:${store.storeId}`}
            label="Remover mapeamento"
            onClick={onRemove}
          />
        </div>
      ) : (
        <div className="flex min-w-0 items-center gap-2">
          <FeatureSelect
            ariaLabel={`Loja do provedor para ${store.storeName}`}
            density="compact"
            disabled={busyKey !== null}
            onChange={onSelect}
            options={[
              { label: "Selecione a loja do provedor", value: "" },
              ...providerStores.map((providerStore) => ({
                label: `${providerStore.name ?? "Loja Credere"} · ${providerStore.externalStoreId}`,
                value: providerStore.externalStoreId,
              })),
            ]}
            value={selection}
          />
          <FeatureActionButton
            disabled={!selection || busyKey !== null}
            isBusy={busyKey === `map:${store.storeId}`}
            label="Mapear"
            onClick={onSave}
            variant="primary"
          />
        </div>
      )}
    </li>
  );
}
