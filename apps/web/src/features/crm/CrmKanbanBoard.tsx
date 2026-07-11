import { useState, useEffect, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getTextColorForBackground } from "../../lib/colors";
import { CrmLeadCard } from "./CrmLeadCard";
import { getLeadStageId, getLinkedLeadVehicles } from "./crmLeadData";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { PipelineStage } from "./crmPipelineStorage";
import type { ProductCrmLead } from "./productCrmTypes";

type Props = {
  stages: PipelineStage[];
  visibleStages: Record<string, boolean>;
  onSelectLead: (leadId: string) => void;
  onUpdateStage: (leadId: string, stageId: string) => Promise<void>;
  vehicleOptions: LeadVehicleOption[];
  viewLeads: ProductCrmLead[];
  onQuickAddDeal: (stageId: string) => void;
  onSimulateClick: (lead: ProductCrmLead) => void;
  onAddStage: () => void;
  onEditStage?: (stage: PipelineStage) => void;
};

export function CrmKanbanBoard({
  stages,
  visibleStages,
  onSelectLead,
  onUpdateStage,
  vehicleOptions,
  viewLeads,
  onQuickAddDeal,
  onSimulateClick,
  onAddStage,
  onEditStage,
}: Props) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<
    Record<string, boolean>
  >({});
  const [activeMenuStageId, setActiveMenuStageId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".crm-stage-menu-container")) {
        setActiveMenuStageId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleDrop = async (
    event: DragEvent<HTMLElement>,
    targetStage: PipelineStage,
  ) => {
    event.preventDefault();
    setDragOverStageId(null);
    const leadId = event.dataTransfer.getData("text/plain") || draggedLeadId;
    setDraggedLeadId(null);
    const lead = leadId ? viewLeads.find((l) => l.id === leadId) : null;
    if (!lead || getLeadStageId(lead) === targetStage.id) return;

    await onUpdateStage(lead.id, targetStage.id);
  };

  const getLeadsForStage = (
    stageId: string,
    stageStatus: PipelineStage["status"],
  ) => {
    return viewLeads.filter((lead) => {
      const leadStageId = getLeadStageId(lead);
      return leadStageId
        ? leadStageId === stageId
        : lead.status === stageId ||
            (stageId === "new" && lead.status === "new") ||
            (lead.status === stageStatus &&
              ["won", "lost"].includes(stageStatus));
    });
  };

  const getStageTotalValue = (stageLeads: ProductCrmLead[]) => {
    const total = stageLeads.reduce((acc, lead) => {
      const value = getLinkedLeadVehicles(lead, vehicleOptions)[0]?.priceCents;
      return acc + (value ?? 0);
    }, 0);
    return total === 0
      ? "R$ 0"
      : new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
          maximumFractionDigits: 0,
        }).format(total / 100);
  };

  return (
    <section
      className="flex gap-4 overflow-x-auto pb-4 select-none min-h-[500px] items-start"
      aria-label="CRM Kanban Board"
    >
      {stages
        .filter((s) => visibleStages[s.id] !== false)
        .map((stage) => {
          const stageLeads = getLeadsForStage(stage.id, stage.status);
          const isCollapsed = collapsedStages[stage.id] === true;
          const isOver = dragOverStageId === stage.id;
          const stageBadgeTextColor = getTextColorForBackground(stage.color);

          if (isCollapsed) {
            return (
              <div
                className="w-10 shrink-0 glass-panel-branded border border-line/60 bg-panel/10 rounded-xl py-3 px-1 flex flex-col items-center justify-between transition-all select-none"
                key={stage.id}
                style={{ height: "550px" }}
              >
                <button
                  aria-label={`Expandir fase ${stage.name}`}
                  className="p-1 rounded hover:bg-line/25 text-muted hover:text-app-text cursor-pointer transition-colors"
                  onClick={() =>
                    setCollapsedStages((prev) => ({
                      ...prev,
                      [stage.id]: false,
                    }))
                  }
                  type="button"
                >
                  <ChevronRight aria-hidden="true" className="size-4" />
                </button>
                <div className="flex-1 flex flex-col items-center gap-3 mt-3 overflow-hidden w-full">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span
                    className="text-xs font-bold text-app-text select-none whitespace-nowrap"
                    style={{
                      writingMode: "vertical-rl",
                    }}
                  >
                    {stage.name}
                  </span>
                </div>
                <div className="size-5 rounded-full bg-line/25 border border-line/40 text-muted text-xs font-black flex items-center justify-center shrink-0">
                  {stageLeads.length}
                </div>
              </div>
            );
          }

          return (
            <article
              className={
                "w-72 shrink-0 glass-panel-branded border rounded-xl flex flex-col max-h-[580px] bg-panel/30 transition-all " +
                (isOver
                  ? "border-accent ring-2 ring-accent/20 scale-[1.01]"
                  : "border-line/60")
              }
              key={stage.id}
              onDragLeave={() => setDragOverStageId(null)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStageId(stage.id);
              }}
              onDrop={(e) => void handleDrop(e, stage)}
            >
              {/* Competitor Header */}
              <header className="p-3 pb-2 flex flex-col gap-1 shrink-0 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="px-2.5 py-0.5 rounded text-xs font-black uppercase shrink-0"
                      style={{
                        backgroundColor: stage.color,
                        color: stageBadgeTextColor,
                      }}
                    >
                      {stage.name}
                    </span>
                    <span className="text-xs font-bold text-muted">
                      {stageLeads.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted">
                    <div className="relative crm-stage-menu-container">
                      <button
                        aria-expanded={activeMenuStageId === stage.id}
                        aria-label={`Abrir menu da fase ${stage.name}`}
                        className="p-1 rounded hover:bg-line/20 hover:text-app-text cursor-pointer flex items-center justify-center size-5"
                        onClick={() =>
                          setActiveMenuStageId(
                            activeMenuStageId === stage.id ? null : stage.id,
                          )
                        }
                        type="button"
                      >
                        <span className="text-xs font-black leading-none pb-1">
                          ...
                        </span>
                      </button>
                      {activeMenuStageId === stage.id && (
                        <div className="absolute right-0 top-full mt-1 z-50 w-36 bg-panel border border-line rounded-lg shadow-xl p-1">
                          <button
                            className="w-full text-left px-2.5 py-1.5 text-xs font-bold rounded-md hover:bg-line/15 text-app-text cursor-pointer"
                            onClick={() => {
                              onEditStage?.(stage);
                              setActiveMenuStageId(null);
                            }}
                            type="button"
                          >
                            Editar etapa
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      aria-label={`Recolher fase ${stage.name}`}
                      className="p-1 rounded hover:bg-line/20 hover:text-app-text cursor-pointer"
                      onClick={() =>
                        setCollapsedStages((prev) => ({
                          ...prev,
                          [stage.id]: true,
                        }))
                      }
                      type="button"
                    >
                      <ChevronLeft aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </div>
                <span className="text-xs font-black text-app-text mt-0.5">
                  {getStageTotalValue(stageLeads)}
                </span>
              </header>

              {/* Card List */}
              <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5 min-h-[150px]">
                {stageLeads.map((lead) => (
                  <CrmLeadCard
                    key={lead.id}
                    lead={lead}
                    onDragStart={setDraggedLeadId}
                    onSelectLead={onSelectLead}
                    onSimulateClick={onSimulateClick}
                    vehicleOptions={vehicleOptions}
                  />
                ))}
                {stageLeads.length === 0 && (
                  <div className="text-center py-8 text-xs font-bold text-muted border border-dashed border-line/30 rounded-lg">
                    Nenhum item.
                  </div>
                )}
              </div>

              {/* Column Footer matching competitor */}
              <footer className="p-2 border-t border-line/20 shrink-0">
                <button
                  className="w-full flex items-center gap-1 py-1.5 text-xs font-bold text-muted hover:text-app-text rounded-lg transition-colors cursor-pointer"
                  onClick={() => onQuickAddDeal(stage.id)}
                  type="button"
                >
                  <Plus aria-hidden="true" className="size-3.5" />
                  <span>Adicionar Negócio</span>
                </button>
              </footer>
            </article>
          );
        })}

      {/* Dotted Criar fase column at the end */}
      <div className="w-72 shrink-0 flex flex-col items-center justify-center p-6 border border-dashed border-line/50 rounded-xl min-h-[200px] bg-panel/10 hover:bg-panel/20 transition-colors">
        <button
          className="flex flex-col items-center gap-2.5 text-muted hover:text-accent cursor-pointer transition-colors group"
          onClick={onAddStage}
          type="button"
        >
          <div className="size-11 rounded-full border border-dashed border-line flex items-center justify-center bg-app-elevated group-hover:border-accent transition-colors">
            <Plus
              aria-hidden="true"
              className="size-5.5 text-muted group-hover:text-accent transition-colors"
            />
          </div>
          <span className="text-xs font-black uppercase tracking-widest">
            Criar fase
          </span>
        </button>
      </div>
    </section>
  );
}
