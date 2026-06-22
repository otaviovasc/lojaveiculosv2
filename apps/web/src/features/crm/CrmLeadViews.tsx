import { CalendarClock, Eye } from "lucide-react";
import { EmptyLeads } from "./CrmEmptyLeads";
import {
  pipelineStatuses,
  sourceLabels,
  statusLabels,
} from "./crmPipelineConfig";
import {
  formatLeadContact,
  formatLeadName,
  formatRelativeDate,
  groupLeadsByStatus,
} from "./crmPipelineModels";
import type { CrmLeadStatus, ProductCrmLead } from "./productCrmTypes";

type LeadViewProps = {
  activeLeadId: string | null;
  leads: ProductCrmLead[];
  onSelectLead: (leadId: string) => void;
  onUpdateStatus: (leadId: string, status: CrmLeadStatus) => Promise<void>;
};

export function LeadKanbanView({
  activeLeadId,
  leads,
  onSelectLead,
  onUpdateStatus,
}: LeadViewProps) {
  const grouped = groupLeadsByStatus(leads);

  return (
    <section className="crm-kanban">
      {pipelineStatuses.map((status) => (
        <div
          className="crm-stage"
          key={status}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const leadId = event.dataTransfer.getData("text/plain");
            if (leadId) void onUpdateStatus(leadId, status);
          }}
        >
          <div className="crm-stage-title">
            <span>{statusLabels[status]}</span>
            <strong>{grouped[status].length}</strong>
          </div>
          <div className="grid gap-2">
            {grouped[status].map((lead) => (
              <LeadCard
                active={activeLeadId === lead.id}
                key={lead.id}
                lead={lead}
                onSelectLead={onSelectLead}
              />
            ))}
            {grouped[status].length === 0 ? (
              <div className="crm-kanban-empty">Nenhum lead</div>
            ) : null}
          </div>
        </div>
      ))}
    </section>
  );
}

export function LeadListView({
  activeLeadId,
  leads,
  onSelectLead,
}: Omit<LeadViewProps, "onUpdateStatus">) {
  if (!leads.length) return <EmptyLeads />;

  return (
    <section className="crm-lead-list">
      {leads.map((lead) => (
        <button
          className={`crm-lead-row ${
            activeLeadId === lead.id ? "crm-lead-row-active" : ""
          }`}
          key={lead.id}
          onClick={() => onSelectLead(lead.id)}
          type="button"
        >
          <span className="crm-avatar">{formatLeadName(lead).slice(0, 2)}</span>
          <span className="min-w-0">
            <strong>{formatLeadName(lead)}</strong>
            <small>{formatLeadContact(lead)}</small>
          </span>
          <span className="crm-status crm-status-open">
            {statusLabels[lead.status]}
          </span>
          <span className="crm-muted-cell">
            {lead.vehicleTitle ?? sourceLabels[lead.source]}
          </span>
          <span className="crm-muted-cell">
            {formatRelativeDate(lead.lastInteractionAt ?? lead.updatedAt)}
          </span>
          <Eye aria-hidden="true" className="size-4" />
        </button>
      ))}
    </section>
  );
}

function LeadCard({
  active,
  lead,
  onSelectLead,
}: {
  active: boolean;
  lead: ProductCrmLead;
  onSelectLead: (leadId: string) => void;
}) {
  return (
    <button
      className={`crm-lead-card ${active ? "crm-lead-card-active" : ""}`}
      draggable
      onClick={() => onSelectLead(lead.id)}
      onDragStart={(event) => event.dataTransfer.setData("text/plain", lead.id)}
      type="button"
    >
      <strong>{formatLeadName(lead)}</strong>
      <span>{formatLeadContact(lead)}</span>
      <small>
        <CalendarClock aria-hidden="true" className="size-3" />
        {formatRelativeDate(lead.lastInteractionAt ?? lead.updatedAt)}
      </small>
    </button>
  );
}
