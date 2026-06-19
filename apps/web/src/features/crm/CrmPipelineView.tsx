import { CircleAlert, RefreshCcw } from "lucide-react";
import { useMemo } from "react";
import { ActivityPanel } from "./CrmActivityPanel";
import {
  LeadCreatePanel,
  LeadDetailPanel,
  PipelineBoard,
} from "./CrmPipelinePanels";
import type {
  CreateProductCrmActivityInput,
  CreateProductCrmLeadInput,
  CrmLeadStatus,
  ProductCrmLead,
  ProductCrmLeadActivity,
} from "./productCrmTypes";

export function CrmPipelineView({
  activities,
  activeLeadId,
  error,
  isLoading,
  leads,
  onCreateActivity,
  onCreateLead,
  onRefresh,
  onSelectLead,
  onUpdateStatus,
}: {
  activities: ProductCrmLeadActivity[];
  activeLeadId: string | null;
  error: Error | null;
  isLoading: boolean;
  leads: ProductCrmLead[];
  onCreateActivity: (
    leadId: string,
    input: CreateProductCrmActivityInput,
  ) => Promise<void>;
  onCreateLead: (input: CreateProductCrmLeadInput) => Promise<void>;
  onRefresh: () => Promise<void>;
  onSelectLead: (leadId: string) => void;
  onUpdateStatus: (leadId: string, status: CrmLeadStatus) => Promise<void>;
}) {
  const activeLead = useMemo(
    () => leads.find((lead) => lead.id === activeLeadId) ?? null,
    [activeLeadId, leads],
  );

  return (
    <main className="mx-auto flex max-w-[var(--layout-content-max)] flex-col gap-5 p-4 lg:p-6">
      <section className="crm-hero crm-hero-green">
        <div className="min-w-0 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-inverse-muted">
            CRM Nativo V2
          </p>
          <h2 className="max-w-3xl text-2xl font-black text-inverse lg:text-4xl">
            Pipeline de leads conectado ao estoque e pronto para WhatsApp IA.
          </h2>
          <p className="max-w-2xl text-sm font-semibold text-inverse-muted">
            Leads, status e atividades agora pertencem ao Loja V2 com escopo,
            permissao e auditoria.
          </p>
        </div>
        <button
          className="crm-hero-status"
          onClick={() => void onRefresh()}
          type="button"
        >
          <RefreshCcw aria-hidden="true" className="size-5" />
          <span>{isLoading ? "Sincronizando" : "Atualizar"}</span>
        </button>
      </section>

      {error ? (
        <section className="crm-note">
          <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
          <span>{error.message}</span>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <LeadCreatePanel onCreateLead={onCreateLead} />
        <PipelineBoard
          activeLeadId={activeLeadId}
          leads={leads}
          onSelectLead={onSelectLead}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <LeadDetailPanel lead={activeLead} onUpdateStatus={onUpdateStatus} />
        <ActivityPanel
          activities={activities}
          lead={activeLead}
          onCreateActivity={onCreateActivity}
        />
      </section>
    </main>
  );
}
