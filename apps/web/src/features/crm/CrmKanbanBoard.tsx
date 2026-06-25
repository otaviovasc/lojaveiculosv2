import type { DragEvent } from "react";
import { useState } from "react";
import { pipelineStatuses, statusLabels } from "./crmPipelineConfig";
import { CrmKanbanLeadCard } from "./CrmKanbanLeadCard";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { CrmLeadStatus, ProductCrmLead } from "./productCrmTypes";

type CrmKanbanBoardProps = {
  onSelectLead: (leadId: string) => void;
  onUpdateStatus: (leadId: string, status: CrmLeadStatus) => Promise<void>;
  vehicleOptions: LeadVehicleOption[];
  viewLeads: ProductCrmLead[];
};

export function CrmKanbanBoard({
  onSelectLead,
  onUpdateStatus,
  vehicleOptions,
  viewLeads,
}: CrmKanbanBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const handleDrop = async (
    event: DragEvent<HTMLElement>,
    status: CrmLeadStatus,
  ) => {
    event.preventDefault();
    const leadId = event.dataTransfer.getData("text/plain") || draggedLeadId;
    setDraggedLeadId(null);
    if (!leadId) return;

    const lead = viewLeads.find((item) => item.id === leadId);
    if (!lead || lead.status === status) return;

    await onUpdateStatus(leadId, status);
  };

  return (
    <section className="crm-client-kanban" aria-label="Kanban de clientes">
      {pipelineStatuses.map((status) => {
        const stageLeads = viewLeads.filter((lead) => lead.status === status);

        return (
          <article
            className="crm-client-stage"
            key={status}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => void handleDrop(event, status)}
          >
            <header className="crm-client-stage-header">
              <div className="crm-client-stage-title">
                <span
                  className={`crm-client-stage-pill crm-client-stage-pill-${status}`}
                >
                  {statusLabels[status]}
                </span>
                <span className="crm-client-stage-count">
                  {stageLeads.length}
                </span>
              </div>
            </header>
            <div className="crm-client-stage-body">
              {stageLeads.map((lead) => (
                <CrmKanbanLeadCard
                  key={lead.id}
                  lead={lead}
                  onDragStart={setDraggedLeadId}
                  onSelectLead={onSelectLead}
                  vehicleOptions={vehicleOptions}
                />
              ))}
              {stageLeads.length === 0 ? (
                <div className="crm-client-empty-stage">Nenhum cliente</div>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}
