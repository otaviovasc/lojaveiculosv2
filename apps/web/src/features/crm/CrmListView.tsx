import { useState, useRef, useEffect } from "react";
import { Car, Globe, MessageSquare, ChevronDown, Clock } from "lucide-react";
import { getContrastColorForText } from "../../lib/colors";
import type { ProductCrmLead } from "./productCrmTypes";
import type { CrmListViewProps } from "./CrmPipelineViewTypes";
import { formatLeadName } from "./crmPipelineModels";
import {
  formatLeadTimelineLabel,
  getLeadStageId,
  getLinkedLeadVehicles,
} from "./crmLeadData";
import { sourceLabels } from "./crmPipelineConfig";

export function CrmListView({
  leads,
  stages,
  vehicleOptions,
  onSelectLead,
  onMoveLeadPipelineStage,
}: CrmListViewProps) {
  const [activeDropdownLeadId, setActiveDropdownLeadId] = useState<
    string | null
  >(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setActiveDropdownLeadId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleStageChange = async (lead: ProductCrmLead, stageId: string) => {
    const targetStage = stages.find((s) => s.id === stageId);
    if (!targetStage) return;

    await onMoveLeadPipelineStage(lead.id, targetStage.id);
    setActiveDropdownLeadId(null);
  };

  const getLeadVehicles = (lead: ProductCrmLead) => {
    return getLinkedLeadVehicles(lead, vehicleOptions);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:hidden">
        {leads.map((lead) => {
          const vehicles = getLeadVehicles(lead);
          const firstVehicle = vehicles[0];
          const leadName = formatLeadName(lead);
          const activeStageId = getLeadStageId(lead);
          const currentStage =
            stages.find((s) => s.id === activeStageId) ?? stages[0];
          const currentStageColor = currentStage?.color ?? "";

          return (
            <article
              className="rounded-xl border border-line bg-panel p-3 shadow-sm"
              key={lead.id}
            >
              <button
                className="flex w-full items-start gap-3 text-left"
                onClick={() => onSelectLead(lead.id)}
                type="button"
              >
                <div className="size-12 rounded-lg bg-app-elevated/60 flex items-center justify-center border border-line/50 overflow-hidden shrink-0">
                  {firstVehicle?.imageUrl ? (
                    <img
                      alt={firstVehicle.label}
                      className="size-full object-cover"
                      src={firstVehicle.imageUrl}
                    />
                  ) : (
                    <Car aria-hidden="true" className="size-5 text-muted" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-app-text">
                        {leadName}
                      </h3>
                      <p className="truncate text-xs font-bold text-muted">
                        {firstVehicle?.label ?? "Sem veículo"}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full border px-2 py-1 text-xs font-black uppercase"
                      style={{
                        backgroundColor: currentStageColor
                          ? `${currentStageColor}15`
                          : "transparent",
                        borderColor: currentStageColor || "var(--color-line)",
                        color: getContrastColorForText(currentStageColor),
                      }}
                    >
                      {currentStage?.name}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-1 text-xs font-bold text-muted">
                    <span>{lead.buyerPhone || "Sem telefone"}</span>
                    <span>{sourceLabels[lead.source]}</span>
                    <span>{formatLeadTimelineLabel(lead)}</span>
                  </div>
                </div>
              </button>
            </article>
          );
        })}
        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-panel/40 p-6 text-center text-xs font-bold text-muted">
            Nenhum negócio encontrado para os filtros ativos.
          </div>
        ) : null}
      </div>

      <div className="crm-table-wrap hidden overflow-x-auto rounded-xl border border-line bg-panel shadow-md md:block">
        <table className="crm-table w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-app-elevated/45">
              <th className="p-3 text-xs font-black uppercase text-muted tracking-wider">
                Veículos
              </th>
              <th className="p-3 text-xs font-black uppercase text-muted tracking-wider">
                Cliente
              </th>
              <th className="p-3 text-xs font-black uppercase text-muted tracking-wider">
                Fase
              </th>
              <th className="p-3 text-xs font-black uppercase text-muted tracking-wider">
                Tempo
              </th>
              <th className="p-3 text-xs font-black uppercase text-muted tracking-wider">
                Origem
              </th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const vehicles = getLeadVehicles(lead);
              const firstVehicle = vehicles[0];
              const leadName = formatLeadName(lead).toUpperCase();
              const activeStageId = getLeadStageId(lead);
              const currentStage =
                stages.find((s) => s.id === activeStageId) ?? stages[0];
              const currentStageColor = currentStage?.color ?? "";
              const remainingCount = vehicles.length - 1;

              return (
                <tr
                  className="border-b border-line/60 hover:bg-line/10 transition-colors cursor-pointer group"
                  key={lead.id}
                  onClick={() => onSelectLead(lead.id)}
                >
                  {/* Vehicles Column */}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-app-elevated/60 flex items-center justify-center border border-line/50 overflow-hidden shrink-0">
                        {firstVehicle?.imageUrl ? (
                          <img
                            alt={firstVehicle.label}
                            className="size-full object-cover"
                            src={firstVehicle.imageUrl}
                          />
                        ) : (
                          <Car className="size-4 text-muted" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-app-text truncate">
                          {firstVehicle ? firstVehicle.label : "Sem veículo"}
                        </span>
                        {remainingCount > 0 && (
                          <span className="text-xs font-black text-accent bg-accent-soft/10 border border-accent/20 rounded px-1.5 py-0.2 w-fit mt-0.5">
                            +{remainingCount} veículo(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Cliente Column */}
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-app-text tracking-wider">
                        {leadName}
                      </span>
                      <span className="text-xs font-bold text-muted mt-0.5">
                        {lead.buyerPhone || "Sem telefone"}
                      </span>
                    </div>
                  </td>

                  {/* Fase Column (Dropdown Selector) */}
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div
                      className="relative inline-block"
                      ref={
                        activeDropdownLeadId === lead.id ? dropdownRef : null
                      }
                    >
                      <button
                        aria-expanded={activeDropdownLeadId === lead.id}
                        aria-label={`Alterar fase de ${formatLeadName(lead)}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border uppercase tracking-wider transition-colors cursor-pointer"
                        onClick={() =>
                          setActiveDropdownLeadId(
                            activeDropdownLeadId === lead.id ? null : lead.id,
                          )
                        }
                        style={{
                          backgroundColor: currentStageColor
                            ? `${currentStageColor}15`
                            : "transparent",
                          borderColor: currentStageColor || "var(--color-line)",
                          color: getContrastColorForText(currentStageColor),
                        }}
                        type="button"
                      >
                        <span>{currentStage?.name}</span>
                        <ChevronDown
                          aria-hidden="true"
                          className="size-3 shrink-0"
                        />
                      </button>

                      {activeDropdownLeadId === lead.id && (
                        <div className="absolute top-full mt-1 left-0 z-50 w-44 bg-panel border border-line rounded-lg shadow-xl p-1 max-h-48 overflow-y-auto">
                          {stages.map((stg) => (
                            <button
                              className={
                                "w-full text-left px-2 py-1.5 text-xs font-bold rounded flex items-center gap-2 cursor-pointer hover:bg-line/15 " +
                                (stg.id === activeStageId ? "bg-line/10" : "")
                              }
                              key={stg.id}
                              onClick={() =>
                                void handleStageChange(lead, stg.id)
                              }
                              type="button"
                            >
                              <span
                                className="size-2.5 rounded-full shrink-0 border border-black/10"
                                style={{ backgroundColor: stg.color }}
                              />
                              <span className="truncate text-app-text">
                                {stg.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Tempo Column */}
                  <td className="p-3">
                    <div className="flex items-center gap-1 text-xs font-bold text-red-700 dark:text-red-500 bg-red-500/5 border border-red-500/10 rounded-lg px-2 py-1 w-fit">
                      <Clock className="size-3 shrink-0" />
                      <span>{formatLeadTimelineLabel(lead)}</span>
                    </div>
                  </td>

                  {/* Origem Column */}
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted">
                      {lead.source === "whatsapp" ? (
                        <MessageSquare className="size-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <Globe className="size-3.5 shrink-0" />
                      )}
                      <span>{sourceLabels[lead.source]}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {leads.length === 0 && (
              <tr>
                <td
                  className="p-8 text-center text-xs font-bold text-muted"
                  colSpan={5}
                >
                  Nenhum negócio encontrado para os filtros ativos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
