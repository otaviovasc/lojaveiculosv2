import { CircleAlert, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { CrmLeadCreateFullPage } from "./CrmLeadCreateFullPage";
import { CrmKanbanBoard } from "./CrmKanbanBoard";
import { CrmLeadDetailFullPage } from "./CrmLeadDetailFullPage";
import { CrmPipelineSummary } from "./CrmPipelineSummary";
import { CrmPipelineToolbar } from "./CrmPipelineToolbar";
import { exportLeadsToCsv } from "./crmClientExport";
import type { CrmPipelineViewProps } from "./CrmPipelineViewTypes";
import type { LeadCreateDraft } from "./crmPipelineModels";

export function CrmPipelineView(props: CrmPipelineViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const activeLead = useMemo(
    () => props.leads.find((lead) => lead.id === props.activeLeadId) ?? null,
    [props.activeLeadId, props.leads],
  );

  const handleCreateLead = async (draft: LeadCreateDraft) => {
    await props.onCreateLead(draft);
    setIsCreateOpen(false);
  };

  const totalClients = props.leads.length;
  const activeClients = props.leads.filter(
    (lead) =>
      lead.status !== "lost" &&
      lead.status !== "won" &&
      lead.status !== "archived",
  ).length;

  const newClients30Days = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return props.leads.filter(
      (lead) => new Date(lead.createdAt) >= thirtyDaysAgo,
    ).length;
  }, [props.leads]);

  if (isCreateOpen) {
    return (
      <main className="crm-page relative min-h-screen">
        <CrmLeadCreateFullPage
          onCancel={() => setIsCreateOpen(false)}
          onCreateLead={handleCreateLead}
          vehicleOptions={props.vehicleOptions}
        />
      </main>
    );
  }

  if (activeLead) {
    return (
      <main className="crm-page relative min-h-screen">
        <CrmLeadDetailFullPage
          activities={props.activities}
          lead={activeLead}
          onBack={() => props.onSelectLead(null)}
          onCreateActivity={props.onCreateActivity}
          onUpdateLead={props.onUpdateLead}
          onUpdateStatus={props.onUpdateStatus}
        />
      </main>
    );
  }

  return (
    <main className="crm-page relative min-h-screen">
      <header className="crm-client-list-header">
        <h1 className="text-2xl font-black text-app-text tracking-tight">
          Clientes
        </h1>
        <button
          className="crm-action crm-action-secondary"
          onClick={() => void props.onRefresh()}
          type="button"
        >
          <RefreshCcw
            aria-hidden="true"
            className={"size-3.5 " + (props.isLoading ? "animate-spin" : "")}
          />
          <span>{props.isLoading ? "Sincronizando" : "Atualizar"}</span>
        </button>
      </header>

      {props.error ? (
        <section className="crm-note">
          <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
          <span>{props.error.message}</span>
        </section>
      ) : null}

      <CrmPipelineSummary
        activeClients={activeClients}
        newClients30Days={newClients30Days}
        totalClients={totalClients}
      />
      <CrmPipelineToolbar
        filters={props.filters}
        onChangeFilters={props.onChangeFilters}
        onCreateClick={() => setIsCreateOpen(true)}
        onExport={() => exportLeadsToCsv(props.viewLeads)}
      />
      <CrmKanbanBoard
        onSelectLead={props.onSelectLead}
        onUpdateStatus={props.onUpdateStatus}
        vehicleOptions={props.vehicleOptions}
        viewLeads={props.viewLeads}
      />
    </main>
  );
}
