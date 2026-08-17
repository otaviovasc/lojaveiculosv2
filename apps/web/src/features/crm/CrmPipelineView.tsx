import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { CrmLeadCreateFullPage } from "./CrmLeadCreateFullPage";
import { CrmKanbanBoard } from "./CrmKanbanBoard";
import { CrmLeadDetailsPage } from "./CrmLeadDetailsPage";
import { CrmPipelineToolbar } from "./CrmPipelineToolbar";
import { CrmPipelineSettingsLayout } from "./CrmPipelineSettingsLayout";
import { CrmSimulationModal } from "./CrmSimulationModal";
import { CrmLeadChatModal } from "./CrmLeadChatModal";
import { Toast, type ToastTone } from "../../components/ui/Toast";
import { getLeadStageId, type FinancingSimulationDraft } from "./crmLeadData";
import type { LeadCreateDraft } from "./crmPipelineModels";
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
import { getFilteredLeads, hasAnyClientFilter } from "./CrmPipelineViewFilters";

export function CrmPipelineView(props: CrmPipelineViewProps) {
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
  } = props.pipelinesState;

  const [visibleStages, setVisibleStages] = useState<Record<string, boolean>>(
    {},
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [simulateLead, setSimulateLead] = useState<ProductCrmLead | null>(null);
  const [chatLead, setChatLead] = useState<ProductCrmLead | null>(null);
  const [toast, setToast] = useState<{
    title: string;
    children?: string;
    tone: ToastTone;
  } | null>(null);

  // Modal control states
  const [quickAddLeadStageId, setQuickAddLeadStageId] = useState<string | null>(
    null,
  );
  const [isQuickPipelineOpen, setIsQuickPipelineOpen] = useState(false);
  const [isQuickStageOpen, setIsQuickStageOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);

  const handleUpdateStageInfo = async (
    name: string,
    color: string,
    slaDays: number | null,
  ) => {
    if (!activePipeline || !editingStage) return;
    const nextStages = activePipeline.stages.map((s) =>
      s.id === editingStage.id ? { ...s, name, color, slaDays } : s,
    );
    try {
      await handleUpdatePipeline({ ...activePipeline, stages: nextStages });
      setEditingStage(null);
      setToast({ title: "Etapa atualizada.", tone: "success" });
    } catch {
      setToast({
        title: "Não foi possível salvar a etapa.",
        children: "A alteração não foi aplicada. Tente novamente.",
        tone: "danger",
      });
    }
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
    const stageName =
      activePipeline?.stages.find((stage) => stage.id === stageId)?.name ?? "";
    try {
      await props.onMoveLeadPipelineStage(leadId, stageId);
      setToast({
        title: "Lead movido de etapa.",
        ...(stageName ? { children: `Nova etapa: ${stageName}.` } : {}),
        tone: "success",
      });
    } catch {
      setToast({
        title: "Não foi possível mover o lead.",
        children: "A alteração não foi aplicada. Tente novamente.",
        tone: "danger",
      });
    }
  };

  const handleQuickAddCreateLead = async (draft: LeadCreateDraft) => {
    try {
      await props.onCreateLead(draft);
      setToast({ title: "Negócio criado com sucesso.", tone: "success" });
    } catch (caught) {
      setToast({
        title: "Não foi possível criar o negócio.",
        children: "Revise os dados e tente novamente.",
        tone: "danger",
      });
      throw caught;
    }
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
  const remainingLeadCount =
    activePipeline?.stages.reduce((total, stage) => {
      const loaded = props.leads.filter(
        (lead) => getLeadStageId(lead) === stage.id,
      ).length;
      return (
        total + Math.max(0, (props.stageTotals[stage.id] ?? loaded) - loaded)
      );
    }, 0) ?? 0;
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
          onSetLeadArchived={props.onSetLeadArchived}
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
          void handleDeletePipeline(id, () => setIsSettingsOpen(false))
        }
        onUpdatePipeline={(updated) => void handleUpdatePipeline(updated)}
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
              onChatClick={setChatLead}
              onQuickAddDeal={setQuickAddLeadStageId}
              onLoadMoreStage={props.onLoadMoreStage}
              onSelectLead={props.onSelectLead}
              onSimulateClick={setSimulateLead}
              onUpdateStage={handleUpdateStage}
              onEditStage={setEditingStage}
              stages={activePipeline.stages}
              loadingStageIds={props.loadingStageIds}
              stageTotals={props.stageTotals}
              vehicleOptions={props.vehicleOptions}
              viewLeads={filteredLeads}
              visibleStages={visibleStages}
            />
          ) : (
            <CrmListView
              isLoadingMore={props.loadingStageIds.size > 0}
              leads={filteredLeads}
              onLoadMore={async () => {
                await Promise.all(
                  activePipeline.stages.map((stage) =>
                    props.onLoadMoreStage(stage.id),
                  ),
                );
              }}
              remaining={remainingLeadCount}
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
          onCreateLead={handleQuickAddCreateLead}
          onClose={() => setQuickAddLeadStageId(null)}
          stageId={quickAddLeadStageId}
          stages={activePipeline.stages}
          vehicleOptions={props.vehicleOptions}
        />
      )}

      {isQuickPipelineOpen && (
        <CrmQuickAddPipelineModal
          onClose={() => setIsQuickPipelineOpen(false)}
          onCreatePipeline={(name, stages) => {
            void handleCreatePipelineConfirm(name, stages).then(
              () =>
                setToast({
                  title: "Pipeline criado com sucesso.",
                  tone: "success",
                }),
              () =>
                setToast({
                  title: "Não foi possível criar o pipeline.",
                  children: "Tente novamente.",
                  tone: "danger",
                }),
            );
          }}
        />
      )}

      {isQuickStageOpen && (
        <CrmQuickAddStageModal
          onAddStage={(name, color, slaDays) => {
            void handleAddStage(name, color, slaDays).then(
              () =>
                setToast({
                  title: "Etapa criada com sucesso.",
                  tone: "success",
                }),
              () =>
                setToast({
                  title: "Não foi possível criar a etapa.",
                  children: "Tente novamente.",
                  tone: "danger",
                }),
            );
          }}
          onClose={() => setIsQuickStageOpen(false)}
        />
      )}

      {editingStage && (
        <CrmEditStageModal
          stage={editingStage}
          onClose={() => setEditingStage(null)}
          onSave={(name, color, slaDays) =>
            void handleUpdateStageInfo(name, color, slaDays)
          }
        />
      )}

      {chatLead && (
        <CrmLeadChatModal
          lead={chatLead}
          onClose={() => setChatLead(null)}
          onConversationStarted={() =>
            setToast({
              title: "Conversa iniciada com sucesso.",
              tone: "success",
            })
          }
        />
      )}

      {toast ? (
        <Toast
          durationMs={4000}
          onDismiss={() => setToast(null)}
          title={toast.title}
          tone={toast.tone}
        >
          {toast.children}
        </Toast>
      ) : null}
    </FeaturePageShell>
  );
}
