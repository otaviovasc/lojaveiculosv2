import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { FeatureAnchoredPopover } from "../../components/ui/FeaturePopover";
import { formatLeadName } from "./crmPipelineModels";
import {
  formatLeadTimelineLabel,
  getLeadStageId,
  getLinkedLeadVehicles,
} from "./crmLeadData";
import type {
  CrmLeadDetailsPageProps,
  DetailTab,
} from "./CrmPipelineViewTypes";
import { CrmLeadDetailsTabs } from "./CrmLeadDetailsTabs";
import { CrmLeadDetailsSidebar } from "./CrmLeadDetailsSidebar";
import { sourceLabels } from "./crmPipelineConfig";
import {
  emptyCrmLeadLinkedRecords,
  loadCrmLeadLinkedRecords,
  type CrmLeadLinkedRecordsState,
} from "./crmLeadLinkedRecords";

export function CrmLeadDetailsPage({
  lead,
  activities,
  stages,
  onBack,
  onMoveLeadPipelineStage,
  onCreateActivity,
  vehicleOptions,
}: CrmLeadDetailsPageProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("visao");
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
  const [linkedRecords, setLinkedRecords] = useState<CrmLeadLinkedRecordsState>(
    emptyCrmLeadLinkedRecords,
  );
  const stageButtonRef = useRef<HTMLButtonElement>(null);

  const leadName = formatLeadName(lead);
  const activeStageId = getLeadStageId(lead);
  const currentStage = stages.find((s) => s.id === activeStageId) ?? stages[0];
  const leadVehicles = getLinkedLeadVehicles(lead, vehicleOptions);

  useEffect(() => {
    let isActive = true;
    setLinkedRecords({ ...emptyCrmLeadLinkedRecords });
    void loadCrmLeadLinkedRecords(lead.id)
      .then((state) => {
        if (isActive) setLinkedRecords(state);
      })
      .catch(() => {
        if (!isActive) return;
        setLinkedRecords({
          documents: [],
          kind: "error",
          message: "Nao foi possivel carregar vendas e documentos vinculados.",
          sales: [],
        });
      });
    return () => {
      isActive = false;
    };
  }, [lead.id]);

  const handleStageChange = async (stageId: string) => {
    const targetStage = stages.find((s) => s.id === stageId);
    if (!targetStage) return;

    await onMoveLeadPipelineStage(lead.id, targetStage.id);
  };

  const tabs = [
    { id: "visao", label: "Visão geral" },
    { id: "chat", label: "Chat" },
    { id: "tarefas", label: "Tarefas" },
    { id: "reunioes", label: "Reuniões" },
    { id: "notas", label: "Notas" },
    { id: "arquivos", label: "Arquivos" },
    { id: "financeiro", label: "Financiamento" },
    { id: "seguro", label: "Seguro" },
    { id: "portal", label: "Portal" },
  ] as const;

  return (
    <div className="crm-client-detail flex flex-col gap-6 text-app-text select-none">
      {/* Top Header Row */}
      <header className="flex items-center justify-between py-2 border-b border-line/10">
        <div className="flex items-center gap-3.5">
          <button
            aria-label="Voltar para clientes"
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg text-muted hover:text-app-text hover:bg-line/15 transition-colors cursor-pointer"
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-base font-black text-app-text uppercase tracking-wide leading-none">
              {leadName}
            </h2>
            <span className="text-xs font-bold text-muted mt-1 uppercase tracking-wider">
              {sourceLabels[lead.source]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full border border-warning/20 bg-warning/10 px-3 py-1 text-xs font-black text-warning-strong">
            {formatLeadTimelineLabel(lead)}
          </span>

          <div className="relative">
            <button
              aria-controls="crm-lead-stage-menu"
              aria-expanded={isStageDropdownOpen}
              aria-haspopup="menu"
              aria-label={`Alterar fase de ${leadName}`}
              onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
              ref={stageButtonRef}
              className="inline-flex h-9 items-center justify-between gap-2.5 rounded-lg border border-line/35 bg-panel/40 pl-4 pr-3 text-xs font-bold text-app-text outline-none hover:bg-line/10 cursor-pointer transition-colors min-w-[140px]"
              type="button"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block size-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: currentStage?.color || "transparent",
                  }}
                />
                <span>{currentStage?.name || "Novo Lead"}</span>
              </div>
              <ChevronDown
                aria-hidden="true"
                className="size-3.5 text-muted shrink-0"
              />
            </button>

            <FeatureAnchoredPopover
              align="end"
              anchorRef={stageButtonRef}
              className="flex w-48 flex-col gap-0.5"
              id="crm-lead-stage-menu"
              isOpen={isStageDropdownOpen}
              offset={4}
              onClose={() => setIsStageDropdownOpen(false)}
            >
              {stages.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    void handleStageChange(s.id);
                    setIsStageDropdownOpen(false);
                  }}
                  className={
                    "w-full text-left px-3.5 py-2 text-xs font-bold transition-colors hover:bg-line/15 flex items-center gap-2 cursor-pointer " +
                    (activeStageId === s.id
                      ? "bg-line/10 text-app-text"
                      : "text-muted hover:text-app-text")
                  }
                  type="button"
                >
                  <span
                    className="inline-block size-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.color || "transparent" }}
                  />
                  <span>{s.name}</span>
                </button>
              ))}
            </FeatureAnchoredPopover>
          </div>
        </div>
      </header>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Left Column Workspace */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Tabs row bar */}
          <div
            aria-label="Seções do cliente"
            className="custom-scrollbar flex items-center gap-1 overflow-x-auto pb-1.5 border-b border-line/10"
            role="tablist"
          >
            {tabs.map((tab) => (
              <button
                aria-selected={activeTab === tab.id}
                className={
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 " +
                  (activeTab === tab.id
                    ? "bg-panel/80 text-app-text border border-line/20"
                    : "text-muted hover:text-app-text")
                }
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DetailTab)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Subviews Content wrapper */}
          <div className="py-2">
            <CrmLeadDetailsTabs
              activeTab={activeTab}
              activities={activities}
              lead={lead}
              linkedRecords={linkedRecords}
              stages={stages}
              onCreateActivity={onCreateActivity}
              vehicleOptions={vehicleOptions}
            />
          </div>
        </div>

        {/* Right Widgets Sidebar Component */}
        <CrmLeadDetailsSidebar
          lead={lead}
          leadName={leadName}
          activities={activities}
          leadVehicles={leadVehicles}
          onCreateActivity={onCreateActivity}
        />
      </div>
    </div>
  );
}
