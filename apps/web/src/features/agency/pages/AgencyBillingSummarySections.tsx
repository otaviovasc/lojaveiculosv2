import { MoveHorizontal } from "lucide-react";
import { BillingAllocationTable } from "../../billing/BillingPanels";
import type { AgencyTenantOverview } from "../apiClient";

export function AgencyBillingAllocation({
  overview,
}: {
  overview: AgencyTenantOverview;
}) {
  return (
    <div className="agency-billing-allocation">
      <p className="agency-billing-table-hint" id="agency-allocation-hint">
        <MoveHorizontal aria-hidden="true" />
        Deslize para conferir todas as colunas da alocação.
      </p>
      <div aria-describedby="agency-allocation-hint">
        <BillingAllocationTable allocations={overview.allocations} />
      </div>
    </div>
  );
}
