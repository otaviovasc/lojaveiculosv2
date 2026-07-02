import { useMemo, useState } from "react";
import { CircleAlert } from "lucide-react";
import { CrmLeadCreateFullPage } from "./CrmLeadCreateFullPage";
import { CrmKanbanBoard } from "./CrmKanbanBoard";
import { CrmLeadDetailsPage } from "./CrmLeadDetailsPage";
import { CrmPipelineToolbar } from "./CrmPipelineToolbar";
import { CrmPipelineSettingsLayout } from "./CrmPipelineSettingsLayout";
import { CrmSimulationModal } from "./CrmSimulationModal";
import type { CrmPipelineViewProps } from "./CrmPipelineViewTypes";
import { saveActivePipelineId, type PipelineStage } from "./crmPipelineStorage";
import {
  FeaturePageShell,
  FeaturePageHeader,
} from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import type { CrmLeadStatus, ProductCrmLead } from "./productCrmTypes";
import { CrmQuickAddLeadModal } from "./CrmQuickAddLeadModal";
import { CrmQuickAddPipelineModal } from "./CrmQuickAddPipelineModal";
import { CrmQuickAddStageModal } from "./CrmQuickAddStageModal";
import { CrmEditStageModal } from "./CrmEditStageModal";
import { CrmListView } from "./CrmListView";
import { useCrmPipelines } from "./useCrmPipelines";
import { getFilteredLeads } from "./CrmPipelineViewFilters";

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
  } = useCrmPipelines(storeId);

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

  const handleUpdateStage = async (
    leadId: string,
    stageId: string,
    status: CrmLeadStatus,
  ) => {
    const lead = props.leads.find((l) => l.id === leadId);
    if (!lead) return;
    if (status !== lead.status) {
      await props.onUpdateStatus(leadId, status);
    }
    await props.onUpdateLead(leadId, {
      metadata: { ...(lead.metadata ?? {}), stageId },
    });
  };

  const handleSaveSimulation = async (leadId: string, data: any) => {
    const lead = props.leads.find((l) => l.id === leadId);
    if (!lead) return;
    await props.onUpdateLead(leadId, {
      metadata: {
        ...lead.metadata,
        simulationValue: data.vehicleValue,
        simulation: data,
      },
    });
    const payF = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(data.monthlyPayment / 100);
    await props.onCreateActivity(leadId, {
      activityType: "note",
      content: `Simulação via card: ${data.months}x de ${payF} (Taxa: ${data.interestRate}% a.m.)`,
      direction: "internal",
    });
  };

  const filteredLeads = useMemo(() => {
    return getFilteredLeads(
      props.viewLeads,
      activePipeline,
      customFilters,
      props.vehicleOptions,
    );
  }, [props.viewLeads, activePipeline, props.vehicleOptions, customFilters]);

  if (isCreateOpen) {
    return (
      <FeaturePageShell
        className="crm-page relative min-h-screen"
        variant="plain"
      >
        <CrmLeadCreateFullPage
          onCancel={() => setIsCreateOpen(false)}
          onCreateLead={async (draft) => {
            await props.onCreateLead(draft);
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
          onUpdateLead={props.onUpdateLead}
          onUpdateStatus={props.onUpdateStatus}
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
        <FeatureAlert
          className="crm-note"
          icon={<CircleAlert aria-hidden="true" className="size-5 shrink-0" />}
        >
          <span>
            {formatApiErrorDisplay(
              props.error,
              "Nao foi possivel carregar o CRM.",
            )}
          </span>
        </FeatureAlert>
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
            onCreateClick={() =>
              setQuickAddLeadStageId(activePipeline?.stages[0]?.id || "new")
            }
            onCreatePipeline={() => setIsQuickPipelineOpen(true)}
            onSelectPipeline={(id) => {
              setActivePipelineId(id);
              saveActivePipelineId(id, storeId);
            }}
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

          {props.viewMode === "kanban" ? (
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
              onUpdateLead={props.onUpdateLead}
              onUpdateStatus={props.onUpdateStatus}
            />
          )}
        </>
      )}

      {simulateLead && (
        <CrmSimulationModal
          lead={simulateLead}
          onClose={() => setSimulateLead(null)}
          onSaveSimulation={handleSaveSimulation}
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
