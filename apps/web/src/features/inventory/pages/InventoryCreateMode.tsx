import { InventoryCreatePage } from "./InventoryCreatePage";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryRouteState } from "../model/inventoryRouteState";

export function InventoryCreateMode({
  api,
  initialStep,
  onBack,
}: {
  api?: InventoryApi | undefined;
  initialStep: InventoryRouteState["createStep"];
  onBack: () => void;
}) {
  return (
    <div className="relative min-h-screen store-dashboard">
      <div className="dashboard-main relative z-10">
        <InventoryCreatePage
          api={api}
          initialStep={initialStep}
          onBack={onBack}
        />
      </div>
    </div>
  );
}
