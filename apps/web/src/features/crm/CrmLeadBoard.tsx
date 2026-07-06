import { LeadTableView } from "./CrmLeadTable";
import { LeadKanbanView, LeadListView } from "./CrmLeadViews";
import type { CrmViewMode } from "./crmPipelineModels";
import type { CrmLeadStatus, ProductCrmLead } from "./productCrmTypes";

export function LeadBoardByMode({
  activeLeadId,
  onSelectLead,
  onUpdateStatus,
  viewLeads,
  viewMode,
}: {
  activeLeadId: string | null;
  onSelectLead: (leadId: string | null) => void;
  onUpdateStatus: (leadId: string, status: CrmLeadStatus) => Promise<void>;
  viewLeads: ProductCrmLead[];
  viewMode: CrmViewMode;
}) {
  if (viewMode === "list") {
    return (
      <LeadListView
        activeLeadId={activeLeadId}
        leads={viewLeads}
        onSelectLead={onSelectLead}
      />
    );
  }

  if (viewMode === "table") {
    return (
      <LeadTableView
        activeLeadId={activeLeadId}
        leads={viewLeads}
        onSelectLead={onSelectLead}
      />
    );
  }

  return (
    <LeadKanbanView
      activeLeadId={activeLeadId}
      leads={viewLeads}
      onSelectLead={onSelectLead}
      onUpdateStatus={onUpdateStatus}
    />
  );
}
