import { CircleAlert, RefreshCcw } from "lucide-react";
import { useMemo } from "react";
import { ActivityPanel } from "./CrmActivityPanel";
import { LeadBoardByMode } from "./CrmLeadBoard";
import { LeadCreatePanel } from "./CrmLeadForms";
import { LeadDetailPanel } from "./CrmLeadDetailPanel";
import { LeadStatsStrip } from "./CrmLeadStats";
import { LeadToolbar } from "./CrmLeadToolbar";
import type { CrmPipelineViewProps } from "./CrmPipelineViewTypes";

export function CrmPipelineView(props: CrmPipelineViewProps) {
  const activeLead = useMemo(
    () => props.leads.find((lead) => lead.id === props.activeLeadId) ?? null,
    [props.activeLeadId, props.leads],
  );

  return (
    <main className="crm-page">
      <section className="crm-hero crm-hero-green">
        <div className="min-w-0 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-inverse-muted">
            CRM Nativo V2
          </p>
          <h2 className="max-w-3xl text-2xl font-black text-inverse lg:text-4xl">
            Pipeline de leads com lista, tarefas e historico de atividades.
          </h2>
          <p className="max-w-2xl text-sm font-semibold text-inverse-muted">
            Leads, status e atividades pertencem ao Loja V2 com escopo,
            permissao e auditoria; WhatsApp segue como integracao transitiva.
          </p>
        </div>
        <button
          className="crm-hero-status"
          onClick={() => void props.onRefresh()}
          type="button"
        >
          <RefreshCcw aria-hidden="true" className="size-5" />
          <span>{props.isLoading ? "Sincronizando" : "Atualizar"}</span>
        </button>
      </section>

      {props.error ? (
        <section className="crm-note">
          <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
          <span>{props.error.message}</span>
        </section>
      ) : null}

      <LeadStatsStrip activities={props.allActivities} leads={props.leads} />
      <LeadToolbar
        filters={props.filters}
        mode={props.viewMode}
        onChangeFilters={props.onChangeFilters}
        onChangeMode={props.onChangeViewMode}
      />

      <section className="crm-workspace-grid">
        <div className="crm-primary-column">
          <LeadBoardByMode {...props} />
        </div>
        <div className="crm-side-column">
          <LeadCreatePanel
            onCreateLead={props.onCreateLead}
            vehicleOptions={props.vehicleOptions}
          />
          <LeadDetailPanel
            lead={activeLead}
            onUpdateLead={props.onUpdateLead}
            onUpdateStatus={props.onUpdateStatus}
          />
        </div>
      </section>

      <ActivityPanel
        activities={props.activities}
        lead={activeLead}
        onCreateActivity={props.onCreateActivity}
      />
    </main>
  );
}
