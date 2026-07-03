import { Clock, User } from "lucide-react";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import {
  formatBrlCents,
  formatLeadOwner,
  getLeadStageId,
  getLinkedLeadVehicles,
} from "./crmLeadData";
import type { ProductCrmLead, ProductCrmLeadActivity } from "./productCrmTypes";
import type { PipelineStage } from "./crmPipelineStorage";

type Props = {
  lead: ProductCrmLead;
  activities: ProductCrmLeadActivity[];
  stages: PipelineStage[];
  vehicleOptions: LeadVehicleOption[];
};

export function CrmLeadDetailsTabsVisao({
  lead,
  activities,
  stages,
  vehicleOptions,
}: Props) {
  const leadVehicles = getLinkedLeadVehicles(lead, vehicleOptions);
  const valueFormatted = lead.listingId
    ? formatBrlCents(leadVehicles[0]?.priceCents)
    : "Sem veículo vinculado";

  const activeStageId = getLeadStageId(lead);
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
      <div>
        <span className="text-xs font-black uppercase text-muted tracking-wider block mb-3">
          Resumo
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-line/20 bg-panel/10 rounded-xl p-4 flex flex-col justify-between min-h-[90px]">
            <span className="text-xs font-bold text-muted uppercase">Fase</span>
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

          <div className="border border-line/20 bg-panel/10 rounded-xl p-4 flex flex-col justify-between min-h-[90px]">
            <span className="text-xs font-bold text-muted uppercase">
              Valor
            </span>
            <span className="text-sm font-black text-app-text">
              {valueFormatted}
            </span>
            <div className="h-1 mt-2" />
          </div>

          <div className="border border-line/20 bg-panel/10 rounded-xl p-4 flex flex-col justify-between min-h-[90px]">
            <span className="text-xs font-bold text-muted uppercase">
              Responsável
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-sm font-black text-app-text">
              <User aria-hidden="true" className="size-3.5 text-blue-500" />
              <span>{formatLeadOwner(lead)}</span>
            </div>
            <div className="h-1 mt-2" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-line/20 bg-panel/10 rounded-xl p-4">
          <span className="text-xs font-bold text-muted uppercase">
            Próxima tarefa
          </span>
          {nextTask ? (
            <div className="flex flex-col gap-0.5 mt-1">
              <p className="text-xs font-extrabold text-app-text">
                {nextTask.content}
              </p>
              {typeof nextTask.metadata?.dueAt === "string" && (
                <span className="text-xs font-bold text-muted">
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
          <span className="text-xs font-bold text-muted uppercase">
            Última interação
          </span>
          {lastActivity ? (
            <div className="flex flex-col gap-0.5 mt-1">
              <p className="text-xs font-extrabold text-app-text truncate">
                {lastActivity.content}
              </p>
              <span className="text-xs font-bold text-muted">
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

      <div className="flex flex-col gap-3.5 mt-2">
        <div className="flex items-center gap-1.5 text-xs font-black text-app-text">
          <Clock aria-hidden="true" className="size-4 text-muted" />
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
                <span className="text-xs font-bold text-muted shrink-0">
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
                  Lead criado
                </span>
              </div>
              <span className="text-xs font-bold text-muted shrink-0">
                {new Date(lead.createdAt).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
