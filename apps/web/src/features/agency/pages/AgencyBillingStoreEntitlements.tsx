import { FeatureSelect } from "../../../components/ui/FeatureControls";
import { BillingEntitlementMatrix } from "../../billing/BillingPanels";
import type {
  BillingEntitlementStatus,
  BillingOverview,
  EntitlementKey,
} from "../../billing/types";
import type { AgencyTenantOverview } from "../apiClient";
import type { AgencyBillingStatus } from "./AgencyBillingPage.model";

export function AgencyBillingStoreEntitlements({
  onReasonChange,
  onStoreChange,
  onUpdate,
  overview,
  panelOverview,
  reasons,
  selectedStoreId,
  status,
}: {
  onReasonChange: (featureKey: EntitlementKey, reason: string) => void;
  onStoreChange: (storeId: string) => void;
  onUpdate: (
    featureKey: EntitlementKey,
    status: BillingEntitlementStatus,
  ) => Promise<void>;
  overview: AgencyTenantOverview;
  panelOverview: BillingOverview;
  reasons: Record<string, string>;
  selectedStoreId: string | null;
  status: AgencyBillingStatus;
}) {
  if (!overview.stores.length) return null;

  return (
    <>
      <section className="billing-panel">
        <header className="billing-panel-header">
          <div>
            <h3>Loja selecionada</h3>
            <p>Escolha a loja para revisar e alterar features.</p>
          </div>
          <FeatureSelect
            onChange={onStoreChange}
            options={overview.stores.map((store) => ({
              label: store.storeName,
              value: store.storeId,
            }))}
            value={selectedStoreId ?? overview.stores[0]?.storeId ?? ""}
          />
        </header>
      </section>
      <BillingEntitlementMatrix
        chargePreview={panelOverview.chargePreview}
        matrix={panelOverview.entitlementMatrix}
        reasons={reasons}
        savingFeatureKey={status.kind === "saving" ? status.featureKey : null}
        onReasonChange={onReasonChange}
        onUpdate={onUpdate}
      />
    </>
  );
}
