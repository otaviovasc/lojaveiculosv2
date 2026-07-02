import { useState } from "react";
import { ArrowLeft, ChevronDown, Star, Trash2 } from "lucide-react";
import { formatLeadName } from "./crmPipelineModels";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type {
  CrmLeadDetailsPageProps,
  DetailTab,
} from "./CrmPipelineViewTypes";
import { CrmLeadDetailsTabs } from "./CrmLeadDetailsTabs";
import { CrmLeadDetailsSidebar } from "./CrmLeadDetailsSidebar";

export function CrmLeadDetailsPage({
  lead,
  activities,
  stages,
  onBack,
  onUpdateLead,
  onUpdateStatus,
  onCreateActivity,
  vehicleOptions,
}: CrmLeadDetailsPageProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("visao");
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);

  const leadName = formatLeadName(lead);
  const activeStageId = (lead.metadata?.stageId as string) || lead.status;
  const currentStage = stages.find((s) => s.id === activeStageId) ?? stages[0];

  const listingIds: string[] = Array.isArray(lead.metadata?.listingIds)
    ? (lead.metadata.listingIds as string[])
    : lead.listingId
      ? [lead.listingId]
      : [];

  const leadVehicles = listingIds
    .map((id) => vehicleOptions.find((v) => v.id === id))
    .filter((v): v is LeadVehicleOption => !!v);

  const handleStageChange = async (stageId: string) => {
    const targetStage = stages.find((s) => s.id === stageId);
    if (!targetStage) return;

    let statusUpdate = lead.status;
    if (targetStage.status === "won") statusUpdate = "won";
    else if (targetStage.status === "lost") statusUpdate = "lost";
    else if (lead.status === "won" || lead.status === "lost")
      statusUpdate = "negotiating";

    if (statusUpdate !== lead.status) {
      await onUpdateStatus(lead.id, statusUpdate);
    }
    await onUpdateLead(lead.id, {
      metadata: { ...lead.metadata, stageId },
    });

    await onCreateActivity(lead.id, {
      activityType: "status_change",
      content: `Alterou a etapa para "${targetStage.name}"`,
      direction: "internal",
    });
  };

  const tabs = [
    { id: "visao", label: "Overview" },
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
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg text-muted hover:text-app-text hover:bg-line/15 transition-colors cursor-pointer"
            type="button"
          >
            <ArrowLeft className="size-5" />
          </button>
          <button
            className="p-1 text-muted hover:text-yellow-500 rounded transition-colors cursor-pointer"
            type="button"
          >
            <Star className="size-4.5" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-base font-black text-app-text uppercase tracking-wide leading-none">
              {leadName}
            </h2>
            <span className="text-[10px] font-bold text-muted mt-1 uppercase tracking-wider">
              {lead.source || "Manual"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-500">
            Última Interação há 5 dias
          </span>

          <div className="relative">
            <button
              onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
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
              <ChevronDown className="size-3.5 text-muted shrink-0" />
            </button>

            {isStageDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsStageDropdownOpen(false)}
                />
                <div className="absolute right-0 top-10 z-50 w-48 bg-panel border border-line/30 rounded-xl shadow-2xl py-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
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
                </div>
              </>
            )}
          </div>

          <button
            className="p-2 text-muted hover:text-red-500 rounded-lg hover:bg-red-500/10 cursor-pointer transition-colors"
            type="button"
          >
            <Trash2 className="size-4.5" />
          </button>
        </div>
      </header>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Left Column Workspace */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Tabs row bar */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1.5 border-b border-line/10 scrollbar-none">
            {tabs.map((tab) => (
              <button
                className={
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 " +
                  (activeTab === tab.id
                    ? "bg-panel/80 text-app-text border border-line/20 shadow-sm"
                    : "text-muted hover:text-app-text")
                }
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DetailTab)}
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
              stages={stages}
              onCreateActivity={onCreateActivity}
              onUpdateLead={onUpdateLead}
              vehicleOptions={vehicleOptions}
            />
          </div>
        </div>

        {/* Right Widgets Sidebar Component */}
        <CrmLeadDetailsSidebar
          lead={lead}
          leadName={leadName}
          activities={activities}
          vehicleOptions={vehicleOptions}
          leadVehicles={leadVehicles}
          onUpdateLead={onUpdateLead}
          onCreateActivity={onCreateActivity}
        />
      </div>
    </div>
  );
}
