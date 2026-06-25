import { ChevronLeft } from "lucide-react";
import { ActivityPanel } from "./CrmActivityPanel";
import { LeadDetailPanel } from "./CrmLeadDetailPanel";
import type { CrmLeadDetailFullPageProps } from "./CrmPipelineViewTypes";

export function CrmLeadDetailFullPage({
  activities,
  lead,
  onBack,
  onCreateActivity,
  onUpdateLead,
  onUpdateStatus,
}: CrmLeadDetailFullPageProps) {
  return (
    <div className="crm-client-detail">
      <header className="crm-client-header-row">
        <button
          className="crm-action crm-action-secondary"
          onClick={onBack}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Voltar
        </button>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-app-text tracking-tight">
            {lead.buyerName || "Sem nome"}
          </h2>
          <p className="text-xs font-bold text-muted">
            Informacoes completas do cliente
          </p>
        </div>
      </header>

      <div className="crm-client-detail-grid">
        <LeadDetailPanel
          lead={lead}
          onUpdateLead={onUpdateLead}
          onUpdateStatus={onUpdateStatus}
        />
        <ActivityPanel
          activities={activities}
          lead={lead}
          onCreateActivity={onCreateActivity}
        />
      </div>
    </div>
  );
}
