import { useState } from "react";
import { Sparkles, Clock, User } from "lucide-react";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { ProductCrmLead, ProductCrmLeadActivity } from "./productCrmTypes";
import type { PipelineStage } from "./crmPipelineStorage";

type Props = {
  lead: ProductCrmLead;
  activities: ProductCrmLeadActivity[];
  stages: PipelineStage[];
  onCreateActivity: (leadId: string, input: any) => Promise<void>;
  vehicleOptions: LeadVehicleOption[];
};

export function CrmLeadDetailsTabsVisao({
  lead,
  activities,
  stages,
  vehicleOptions,
}: Props) {
  const [loadingAi, setLoadingAi] = useState(false);

  const listingIds: string[] = Array.isArray(lead.metadata?.listingIds)
    ? (lead.metadata.listingIds as string[])
    : lead.listingId
      ? [lead.listingId]
      : [];

  const leadVehicles = listingIds
    .map((id) => vehicleOptions.find((v) => v.id === id))
    .filter((v): v is LeadVehicleOption => !!v);

  const firstVehiclePrice = leadVehicles[0]?.priceCents;

  const valueFormatted = firstVehiclePrice
    ? new Intl.NumberFormat("pt-BR", {
        currency: "BRL",
        style: "currency",
      }).format(firstVehiclePrice / 100)
    : "R$ 410.000,00";

  const activeStageId = (lead.metadata?.stageId as string) || lead.status;
  const currentStage = stages.find((s) => s.id === activeStageId) ?? stages[0];
  const currentStageIndex = stages.findIndex((s) => s.id === activeStageId);
  const activeIndex = currentStageIndex >= 0 ? currentStageIndex : 0;

  // pending tasks
  const pendingTasks = activities.filter((a) => a.activityType === "task");
  const nextTask = pendingTasks[0];

  // last interaction
  const lastActivity = activities[0];

  return (
    <div className="flex flex-col gap-6 text-app-text select-none">
      {/* HIGHLIGHTS Section */}
      <div>
        <span className="text-[10px] font-black uppercase text-muted tracking-wider block mb-3">
          Highlights
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card: Fase */}
          <div className="border border-line/20 bg-panel/10 rounded-xl p-4 flex flex-col justify-between min-h-[90px]">
            <span className="text-[10px] font-bold text-muted uppercase">
              Fase
            </span>
            <span className="text-sm font-black text-app-text">
              {currentStage?.name || "Novo Lead"}
            </span>
            <div className="flex items-center gap-1 mt-2">
              {stages.map((s, i) => (
                <div
                  key={s.id}
                  className={
                    "h-1 flex-1 rounded-full " +
                    (i <= activeIndex ? "bg-blue-500" : "bg-line/25")
                  }
                  style={
                    i <= activeIndex && s.color
                      ? { backgroundColor: s.color }
                      : undefined
                  }
                />
              ))}
            </div>
          </div>

          {/* Card: Valor */}
          <div className="border border-line/20 bg-panel/10 rounded-xl p-4 flex flex-col justify-between min-h-[90px]">
            <span className="text-[10px] font-bold text-muted uppercase">
              Valor
            </span>
            <span className="text-sm font-black text-app-text">
              {valueFormatted}
            </span>
            <div className="h-1 mt-2" />
          </div>

          {/* Card: Responsável */}
          <div className="border border-line/20 bg-panel/10 rounded-xl p-4 flex flex-col justify-between min-h-[90px]">
            <span className="text-[10px] font-bold text-muted uppercase">
              Responsável
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-sm font-black text-app-text">
              <User className="size-3.5 text-blue-500" />
              <span>Kauan Massuia</span>
            </div>
            <div className="h-1 mt-2" />
          </div>
        </div>
      </div>

      {/* Task & Interaction row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-line/20 bg-panel/10 rounded-xl p-4">
          <span className="text-[10px] font-bold text-muted uppercase">
            Próxima tarefa
          </span>
          {nextTask ? (
            <div className="flex flex-col gap-0.5 mt-1">
              <p className="text-xs font-extrabold text-app-text">
                {nextTask.content}
              </p>
              {typeof nextTask.metadata?.dueAt === "string" && (
                <span className="text-[10px] font-bold text-muted">
                  Prazo:{" "}
                  {new Date(nextTask.metadata.dueAt).toLocaleString("pt-BR")}
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs font-bold text-muted mt-1">
              Nenhuma tarefa pendente
            </p>
          )}
        </div>
        <div className="border border-line/20 bg-panel/10 rounded-xl p-4">
          <span className="text-[10px] font-bold text-muted uppercase">
            Última Interação
          </span>
          {lastActivity ? (
            <div className="flex flex-col gap-0.5 mt-1">
              <p className="text-xs font-extrabold text-app-text truncate">
                {lastActivity.content}
              </p>
              <span className="text-[10px] font-bold text-muted">
                {new Date(lastActivity.occurredAt).toLocaleString("pt-BR")}
              </span>
            </div>
          ) : (
            <p className="text-xs font-bold text-muted mt-1">
              Nenhuma interação registrada
            </p>
          )}
        </div>
      </div>

      {/* AI Insights banner */}
      <div className="border border-dashed border-blue-600/30 bg-blue-600/5 rounded-xl p-4 flex items-center justify-between gap-4 mt-2">
        <div className="flex items-start gap-3">
          <Sparkles className="size-4.5 text-blue-500 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-black text-app-text">
              Insights IA
            </span>
            <span className="text-[11px] font-bold text-muted">
              Analise esta oportunidade com IA
            </span>
          </div>
        </div>
        <button
          onClick={() => setLoadingAi(true)}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[11px] font-bold text-white hover:bg-blue-700 transition-colors shrink-0"
          type="button"
        >
          <Sparkles className="size-3" />
          <span>{loadingAi ? "Analisando..." : "Analisar"}</span>
        </button>
      </div>

      {/* Histórico Section */}
      <div className="flex flex-col gap-3.5 mt-2">
        <div className="flex items-center gap-1.5 text-xs font-black text-app-text">
          <Clock className="size-4 text-muted" />
          <span>Histórico</span>
        </div>
        <div className="flex flex-col pl-3.5 relative before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-line/20 gap-3.5">
          {activities.length > 0 ? (
            activities.map((act) => (
              <div
                key={act.id}
                className="relative pl-5 flex items-start justify-between gap-4"
              >
                <span className="absolute left-0 top-1.5 size-2 rounded-full bg-blue-600 border border-blue-600" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-app-text">
                    {act.content}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-muted shrink-0">
                  {new Date(act.occurredAt).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            ))
          ) : (
            <div className="relative pl-5 flex items-start justify-between gap-4">
              <span className="absolute left-0 top-1.5 size-2 rounded-full bg-blue-600 border border-blue-600" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-app-text">
                  Negócio criado
                </span>
              </div>
              <span className="text-[10px] font-bold text-muted shrink-0">
                há 5 dias
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
