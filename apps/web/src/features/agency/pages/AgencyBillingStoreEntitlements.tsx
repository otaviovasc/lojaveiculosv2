import { Building2, WalletCards } from "lucide-react";
import { FeatureSelect } from "../../../components/ui/FeatureControls";
import { money } from "../../billing/billingFormat";
import type { AgencyTenantOverview } from "../apiClient";

export function AgencyBillingStoreEntitlements({
  onStoreChange,
  overview,
  selectedStoreId,
}: {
  onStoreChange: (storeId: string) => void;
  overview: AgencyTenantOverview;
  selectedStoreId: string | null;
}) {
  const selectedStore =
    overview.stores.find((store) => store.storeId === selectedStoreId) ??
    overview.stores[0];
  if (!selectedStore) return null;
  return (
    <section className="agency-store-billing-workspace">
      <header className="agency-store-billing-context">
        <div className="agency-store-billing-title">
          <span aria-hidden="true">
            <Building2 />
          </span>
          <div>
            <small>Contratação por loja</small>
            <h2>{selectedStore.storeName}</h2>
            <p>
              Revise o contrato efetivo e escolha um dos cinco planos
              cumulativos.
            </p>
          </div>
        </div>
        <div className="agency-store-billing-select">
          <span>Loja selecionada</span>
          <FeatureSelect
            ariaLabel="Loja selecionada"
            onChange={onStoreChange}
            options={overview.stores.map((store) => ({
              label: store.storeName,
              value: store.storeId,
            }))}
            value={selectedStore.storeId}
          />
        </div>
        <div className="agency-store-billing-metrics">
          <strong>
            <WalletCards aria-hidden="true" />
            {money(selectedStore.monthlyAmountCents)}/mês
          </strong>
        </div>
      </header>
    </section>
  );
}
