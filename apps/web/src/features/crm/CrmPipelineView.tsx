import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { CrmLeadCreateFullPage } from "./CrmLeadCreateFullPage";
import { CrmKanbanBoard } from "./CrmKanbanBoard";
import { CrmLeadDetailsPage } from "./CrmLeadDetailsPage";
import { CrmPipelineToolbar } from "./CrmPipelineToolbar";
import { CrmPipelineSettingsLayout } from "./CrmPipelineSettingsLayout";
import {
  CrmSimulationModal,
  type FinancingSimulationDraft,
} from "./CrmSimulationModal";
import type { CrmPipelineViewProps } from "./CrmPipelineViewTypes";
import { type PipelineStage } from "./crmPipelineStorage";
import {
  FeaturePageShell,
  FeaturePageHeader,
} from "../../components/ui/FeatureLayout";
import { FeatureEmptyState } from "../../components/ui/FeatureStates";
import type { ProductCrmLead } from "./productCrmTypes";
import { CrmQuickAddLeadModal } from "./CrmQuickAddLeadModal";
import { CrmQuickAddPipelineModal } from "./CrmQuickAddPipelineModal";
import { CrmQuickAddStageModal } from "./CrmQuickAddStageModal";
import { CrmEditStageModal } from "./CrmEditStageModal";
import { CrmListView } from "./CrmListView";
import { CrmPipelineAlert, CrmPipelineLoading } from "./CrmPipelineViewStates";
import { useCrmPipelines } from "./useCrmPipelines";
import { getFilteredLeads, hasAnyClientFilter } from "./CrmPipelineViewFilters";

export function CrmPipelineView(props: CrmPipelineViewProps) {
  const storeId = props.leads[0]?.storeId ?? "default";

  const {
    pipelines,
    activePipelineId,
    activePipeline,
    setActivePipelineId,
    handleCreatePipelineConfirm,
    handleUpdatePipeline,
    handleDeletePipeline,
    handleAddStage,
    isLoading: isPipelineLoading,
    error: pipelineError,
  } = useCrmPipelines(storeId, props.pipelineApi);

  const [visibleStages, setVisibleStages] = useState<Record<string, boolean>>(
    {},
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [simulateLead, setSimulateLead] = useState<ProductCrmLead | null>(null);

  // Modal control states
  const [quickAddLeadStageId, setQuickAddLeadStageId] = useState<string | null>(
    null,
  );
  const [isQuickPipelineOpen, setIsQuickPipelineOpen] = useState(false);
  const [isQuickStageOpen, setIsQuickStageOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);

  const handleUpdateStageInfo = (
    name: string,
    color: string,
    slaDays: number | null,
  ) => {
    if (!activePipeline || !editingStage) return;
    const nextStages = activePipeline.stages.map((s) =>
      s.id === editingStage.id ? { ...s, name, color, slaDays } : s,
    );
    handleUpdatePipeline({ ...activePipeline, stages: nextStages });
    setEditingStage(null);
  };

  // Custom filter selections
  const [customFilters, setCustomFilters] = useState({
    resposta: [] as string[],
    origem: [] as string[],
    responsavel: [] as string[],
    semInteracao: "",
    fonte: [] as string[],
  });

  const activeLead = useMemo(
    () => props.leads.find((lead) => lead.id === props.activeLeadId) ?? null,
    [props.activeLeadId, props.leads],
  );

  const handleUpdateStage = async (leadId: string, stageId: string) => {
    const lead = props.leads.find((l) => l.id === leadId);
    if (!lead) return;
    await props.onMoveLeadPipelineStage(leadId, stageId);
  };

  const handleSaveSimulation = async (
    leadId: string,
    data: FinancingSimulationDraft,
  ) => {
    const lead = props.leads.find((l) => l.id === leadId);
    if (!lead) return;
    const payF = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(data.monthlyPaymentCents / 100);
    await props.onCreateActivity(leadId, {
      activityType: "note",
      content: `Simulação de financiamento: ${data.months}x de ${payF} (Taxa: ${data.interestRate}% a.m.)`,
      direction: "internal",
    });
  };

  const filteredLeads = useMemo(() => {
    return getFilteredLeads(props.viewLeads, activePipeline, customFilters);
  }, [props.viewLeads, activePipeline, customFilters]);
  const hasActiveFilters = hasAnyClientFilter(props.filters, customFilters);
  const openQuickAddLead = () =>
    setQuickAddLeadStageId(activePipeline?.stages[0]?.id ?? "new");
  const resetClientFilters = () => {
    props.onChangeFilters({ search: "", source: "all", status: "all" });
    setCustomFilters({
      resposta: [],
      origem: [],
      responsavel: [],
      semInteracao: "",
      fonte: [],
    });
  };

  if (isCreateOpen) {
    return (
      <FeaturePageShell
        className="crm-page relative min-h-screen"
        variant="plain"
      >
        <CrmLeadCreateFullPage
          onCancel={() => setIsCreateOpen(false)}
          onCreateLead={async (draft) => {
            const firstStageId = activePipeline?.stages[0]?.id;
            await props.onCreateLead({
              ...draft,
              ...(firstStageId ? { initialPipelineStageId: firstStageId } : {}),
            });
            setIsCreateOpen(false);
          }}
          vehicleOptions={props.vehicleOptions}
        />
      </FeaturePageShell>
    );
  }

  if (activeLead && activePipeline) {
    return (
      <FeaturePageShell
        className="crm-page relative min-h-screen"
        variant="plain"
      >
        <CrmLeadDetailsPage
          activities={props.activities}
          lead={activeLead}
          onBack={() => props.onSelectLead(null)}
          onCreateActivity={props.onCreateActivity}
          onMoveLeadPipelineStage={props.onMoveLeadPipelineStage}
          stages={activePipeline.stages}
          vehicleOptions={props.vehicleOptions}
        />
      </FeaturePageShell>
    );
  }

  if (isSettingsOpen && activePipeline) {
    return (
      <CrmPipelineSettingsLayout
        onBack={() => setIsSettingsOpen(false)}
        onDeletePipeline={(id) =>
          handleDeletePipeline(id, () => setIsSettingsOpen(false))
        }
        onUpdatePipeline={handleUpdatePipeline}
        pipeline={activePipeline}
      />
    );
  }

  return (
    <FeaturePageShell
      className="crm-page relative min-h-screen"
      variant="plain"
    >
      <FeaturePageHeader eyebrow="Atendimento" title="Clientes" />

      {props.error && (
        <CrmPipelineAlert
          error={props.error}
          fallback="Não foi possível carregar os clientes."
        />
      )}

      {pipelineError && (
        <CrmPipelineAlert
          error={pipelineError}
          fallback="Não foi possível carregar os pipelines."
        />
      )}

      {!activePipeline && isPipelineLoading && !pipelineError && (
        <CrmPipelineLoading
          body="Buscando etapas e configurações do CRM."
          title="Carregando pipelines"
        />
      )}

      {activePipeline && (
        <>
          <CrmPipelineToolbar
            activePipelineId={activePipelineId}
            customFilters={customFilters}
            filters={props.filters}
            onChangeCustomFilters={setCustomFilters}
            onChangeFilters={props.onChangeFilters}
            onConfigureClick={() => setIsSettingsOpen(true)}
            onCreateClick={openQuickAddLead}
            onCreatePipeline={() => setIsQuickPipelineOpen(true)}
            onSelectPipeline={setActivePipelineId}
            onToggleStageVisibility={(id) =>
              setVisibleStages((prev) => ({
                ...prev,
                [id]: prev[id] === false,
              }))
            }
            pipelines={pipelines}
            stages={activePipeline.stages}
            visibleStages={visibleStages}
            viewMode={props.viewMode}
            onChangeViewMode={props.onChangeViewMode}
          />

          {props.error || pipelineError ? null : isPipelineLoading ? (
            <CrmPipelineLoading
              body="Buscando etapas e configurações do CRM."
              title="Carregando pipelines"
            />
          ) : props.isLoading ? (
            <CrmPipelineLoading
              body="Buscando clientes e atividades do CRM."
              title="Carregando clientes"
            />
          ) : filteredLeads.length === 0 ? (
            <FeatureEmptyState
              action={
                <button
                  className="crm-action"
                  onClick={
                    hasActiveFilters ? resetClientFilters : openQuickAddLead
                  }
                  type="button"
                >
                  {hasActiveFilters ? "Limpar filtros" : "Nova negociação"}
                </button>
              }
              body={
                hasActiveFilters
                  ? "Ajuste a busca ou limpe os filtros para voltar à lista de clientes."
                  : "Cadastre o primeiro cliente ou negócio para iniciar o acompanhamento comercial."
              }
              icon={SearchX}
              title={
                hasActiveFilters
                  ? "Nenhum negócio encontrado para os filtros ativos."
                  : "Nenhum cliente cadastrado."
              }
            />
          ) : props.viewMode === "kanban" ? (
            <CrmKanbanBoard
              onAddStage={() => setIsQuickStageOpen(true)}
              onQuickAddDeal={setQuickAddLeadStageId}
              onSelectLead={props.onSelectLead}
              onSimulateClick={setSimulateLead}
              onUpdateStage={handleUpdateStage}
              onEditStage={setEditingStage}
              stages={activePipeline.stages}
              vehicleOptions={props.vehicleOptions}
              viewLeads={filteredLeads}
              visibleStages={visibleStages}
            />
          ) : (
            <CrmListView
              leads={filteredLeads}
              stages={activePipeline.stages}
              vehicleOptions={props.vehicleOptions}
              onSelectLead={props.onSelectLead}
              onMoveLeadPipelineStage={props.onMoveLeadPipelineStage}
            />
          )}
        </>
      )}

      {simulateLead && (
        <CrmSimulationModal
          lead={simulateLead}
          onClose={() => setSimulateLead(null)}
          onSaveSimulation={handleSaveSimulation}
          vehicleOptions={props.vehicleOptions}
        />
      )}

      {quickAddLeadStageId && activePipeline && (
        <CrmQuickAddLeadModal
          onCreateLead={props.onCreateLead}
          onClose={() => setQuickAddLeadStageId(null)}
          stageId={quickAddLeadStageId}
          stages={activePipeline.stages}
          vehicleOptions={props.vehicleOptions}
        />
      )}

      {isQuickPipelineOpen && (
        <CrmQuickAddPipelineModal
          onClose={() => setIsQuickPipelineOpen(false)}
          onCreatePipeline={handleCreatePipelineConfirm}
        />
      )}

      {isQuickStageOpen && (
        <CrmQuickAddStageModal
          onAddStage={handleAddStage}
          onClose={() => setIsQuickStageOpen(false)}
        />
      )}

      {editingStage && (
        <CrmEditStageModal
          stage={editingStage}
          onClose={() => setEditingStage(null)}
          onSave={handleUpdateStageInfo}
        />
      )}
    </FeaturePageShell>
  );
}
