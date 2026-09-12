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
    <li className="credere-mapping-row">
      <div className="credere-mapping-store">
        <span>{store.storeName}</span>
        <small>{store.storeSlug}</small>
      </div>
      <div className="credere-mapping-status">
        {mapping ? (
          <FeatureStatusBadge size="dense" tone="success">
            Vinculada
          </FeatureStatusBadge>
        ) : (
          <FeatureStatusBadge size="dense" tone="warning">
            Pendente
          </FeatureStatusBadge>
        )}
      </div>
      {mapping ? (
        <div className="credere-mapping-control">
          <span>{mapping.externalStoreAlias ?? "Loja Credere vinculada"}</span>
          <FeatureActionButton
            disabled={busyKey !== null}
            icon={Link2Off}
            isBusy={busyKey === `unmap:${store.storeId}`}
            label={`Remover mapeamento de ${store.storeName}`}
            onClick={onRemove}
          >
            Remover mapeamento
          </FeatureActionButton>
        </div>
      ) : (
        <div className="credere-mapping-control">
          <FeatureSelect
            ariaLabel={`Loja do provedor para ${store.storeName}`}
            density="compact"
            disabled={busyKey !== null}
            onChange={onSelect}
            options={[
              { label: "Selecione a loja do provedor", value: "" },
              ...providerStores.map((providerStore) => ({
                label: providerStore.name ?? "Loja Credere",
                value: providerStore.externalStoreId,
              })),
            ]}
            value={selection}
          />
          <FeatureActionButton
            disabled={!selection || busyKey !== null}
            isBusy={busyKey === `map:${store.storeId}`}
            label={`Mapear ${store.storeName}`}
            onClick={onSave}
            variant="primary"
          >
            Mapear
          </FeatureActionButton>
        </div>
      )}
    </li>
  );
}
