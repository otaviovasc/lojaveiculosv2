import { LeadTableView } from "./CrmLeadTable";
import { LeadKanbanView, LeadListView } from "./CrmLeadViews";
import type { CrmPipelineViewProps } from "./CrmPipelineViewTypes";

export function LeadBoardByMode({
  activeLeadId,
  onSelectLead,
  onUpdateStatus,
  viewLeads,
  viewMode,
}: CrmPipelineViewProps) {
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
