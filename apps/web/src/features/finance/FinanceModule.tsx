import type { FinanceApi } from "./apiClient";
import { CommissionWorkspace } from "./CommissionWorkspace";
import { FinanceEntriesWorkspace } from "./FinanceEntriesWorkspace";
import type { FinanceEntryType } from "./types";

export function FinanceModule({
  api,
  defaultActiveType = "expense",
  onNavigate,
}: {
  api?: FinanceApi;
  defaultActiveType?: FinanceEntryType;
  onNavigate?: (moduleId: "reports") => void;
}) {
  if (defaultActiveType === "commission") {
    return api ? <CommissionWorkspace api={api} /> : <CommissionWorkspace />;
  }

  return (
    <FinanceEntriesWorkspace
      api={api}
      defaultActiveType={defaultActiveType}
      onNavigate={onNavigate}
    />
  );
}
