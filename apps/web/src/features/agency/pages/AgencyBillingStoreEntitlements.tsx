import { Building2, PackageCheck, WalletCards } from "lucide-react";
import { FeatureSelect } from "../../../components/ui/FeatureControls";
import { BillingPlanComposition } from "../../billing/BillingPanels";
import { BillingCrmPackage } from "../../billing/BillingCrmPackage";
import { money } from "../../billing/billingFormat";
import type { BillingOverview } from "../../billing/types";
import type { AgencyTenantOverview } from "../apiClient";

export function AgencyBillingStoreEntitlements({
  onStoreChange,
  overview,
  panelOverview,
  selectedStoreId,
  zapiRequestSaving,
  onCancelZapi,
  onRequestZapi,
  selectedAddonIds,
  onAddonToggle,
}: {
  onStoreChange: (storeId: string) => void;
  overview: AgencyTenantOverview;
  panelOverview: BillingOverview;
  selectedStoreId: string | null;
  zapiRequestSaving: boolean;
  onCancelZapi: () => void;
  onRequestZapi: () => void;
  selectedAddonIds: readonly string[];
  onAddonToggle: (addonId: string) => void;
}) {
  if (!overview.stores.length) return null;
  const selectedStore =
    overview.stores.find((store) => store.storeId === selectedStoreId) ??
    overview.stores[0];
  if (!selectedStore) return null;
  const selectedPlan =
    panelOverview.subscription?.plan ??
    overview.plans.find((plan) => plan.status === "active") ??
    null;
  const crmAddon = overview.addons.find(
    (addon) =>
      addon.status === "active" &&
      addon.code === "crm_core" &&
      (!selectedPlan || addon.catalogVersion === selectedPlan.catalogVersion),
  );
  const zapiAddon = overview.addons.find(
    (addon) =>
      addon.status === "active" &&
      addon.code === "crm_zapi" &&
      (!selectedPlan || addon.catalogVersion === selectedPlan.catalogVersion),
  );
  const crmSelected = crmAddon ? selectedAddonIds.includes(crmAddon.id) : false;

  return (
    <section className="agency-store-billing-workspace">
      <header className="agency-store-billing-context">
        <div className="agency-store-billing-title">
          <span aria-hidden="true">
            <Building2 />
          </span>
          <div>
            <small>Configuração por loja</small>
            <h2>{selectedStore.storeName}</h2>
            <p>
              Escolha uma operação para revisar o plano e ampliar seus pacotes.
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
            value={selectedStoreId ?? overview.stores[0]?.storeId ?? ""}
          />
        </div>
        <div className="agency-store-billing-metrics">
          <span>
            <PackageCheck aria-hidden="true" />
            {selectedStore.addonCount} pacote
            {selectedStore.addonCount === 1 ? "" : "s"}
          </span>
          <strong>
            <WalletCards aria-hidden="true" />
            {money(selectedStore.monthlyAmountCents)}/mês
          </strong>
        </div>
      </header>
      <BillingPlanComposition
        canManage={panelOverview.authority.currentActorCanManage}
        contextLabel={selectedStore.storeName}
        overview={panelOverview}
      />
      {crmAddon ? (
        <BillingCrmPackage
          canManage={panelOverview.authority.currentActorCanManage}
          contract={
            selectedStore.addonContracts?.find(
              (contract) => contract.addonCode === "crm_zapi",
            ) ?? null
          }
          crmAddon={crmAddon}
          isBusy={zapiRequestSaving}
          isCrmSelected={crmSelected}
          isZapiSelected={
            zapiAddon ? selectedAddonIds.includes(zapiAddon.id) : false
          }
          onCancelZapi={onCancelZapi}
          onRequestZapi={onRequestZapi}
          onToggleCrm={() => onAddonToggle(crmAddon.id)}
          onToggleZapi={() =>
            zapiAddon ? onAddonToggle(zapiAddon.id) : undefined
          }
          subscriptionStatus={selectedStore.subscriptionStatus}
          zapiAddon={zapiAddon ?? null}
        />
      ) : null}
    </section>
  );
}
