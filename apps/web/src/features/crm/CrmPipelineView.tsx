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
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";

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
      <FeaturePageShell
        className="crm-page relative min-h-screen"
        variant="plain"
      >
        <CrmLeadCreateFullPage
          onCancel={() => setIsCreateOpen(false)}
          onCreateLead={handleCreateLead}
          vehicleOptions={props.vehicleOptions}
        />
      </FeaturePageShell>
    );
  }

  if (activeLead) {
    return (
      <FeaturePageShell
        className="crm-page relative min-h-screen"
        variant="plain"
      >
        <CrmLeadDetailFullPage
          activities={props.activities}
          lead={activeLead}
          onBack={() => props.onSelectLead(null)}
          onCreateActivity={props.onCreateActivity}
          onUpdateLead={props.onUpdateLead}
          onUpdateStatus={props.onUpdateStatus}
        />
      </FeaturePageShell>
    );
  }

  return (
    <FeaturePageShell
      className="crm-page relative min-h-screen"
      variant="plain"
    >
      <FeaturePageHeader
        actions={
          <FeatureActionButton
            icon={RefreshCcw}
            isBusy={props.isLoading}
            label={props.isLoading ? "Sincronizando" : "Atualizar"}
            onClick={() => void props.onRefresh()}
          />
        }
        eyebrow="Atendimento"
        title="Clientes"
      />

      {props.error ? (
        <FeatureAlert
          className="crm-note"
          icon={<CircleAlert aria-hidden="true" className="size-5 shrink-0" />}
        >
          <span>{props.error.message}</span>
        </FeatureAlert>
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
    </FeaturePageShell>
  );
}
