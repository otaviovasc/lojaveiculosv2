import { useState, useRef, useEffect } from "react";
import { Car, Globe, MessageSquare, ChevronDown, Clock } from "lucide-react";
import type { ProductCrmLead, CrmLeadStatus } from "./productCrmTypes";
import type {
  LeadVehicleOption,
  CrmListViewProps,
} from "./CrmPipelineViewTypes";
import type { PipelineStage } from "./crmPipelineStorage";
import { formatLeadName, type LeadContactPatch } from "./crmPipelineModels";

export function CrmListView({
  leads,
  stages,
  vehicleOptions,
  onSelectLead,
  onUpdateLead,
  onUpdateStatus,
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
    setActiveDropdownLeadId(null);
  };

  const getLeadVehicles = (lead: ProductCrmLead) => {
    const listingIds: string[] = Array.isArray(lead.metadata?.listingIds)
      ? (lead.metadata.listingIds as string[])
      : lead.listingId
        ? [lead.listingId]
        : [];
    return listingIds
      .map((id) => vehicleOptions.find((v) => v.id === id))
      .filter((v): v is LeadVehicleOption => !!v);
  };

  return (
    <div className="crm-table-wrap glass-panel-branded bg-panel rounded-xl border border-line shadow-md overflow-x-auto">
      <table className="crm-table w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line bg-app-elevated/45">
            <th className="p-3 text-[10px] font-black uppercase text-muted tracking-wider">
              Veículos
            </th>
            <th className="p-3 text-[10px] font-black uppercase text-muted tracking-wider">
              Cliente
            </th>
            <th className="p-3 text-[10px] font-black uppercase text-muted tracking-wider">
              Fase
            </th>
            <th className="p-3 text-[10px] font-black uppercase text-muted tracking-wider">
              Tempo
            </th>
            <th className="p-3 text-[10px] font-black uppercase text-muted tracking-wider">
              Origem
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const vehicles = getLeadVehicles(lead);
            const firstVehicle = vehicles[0];
            const leadName = formatLeadName(lead).toUpperCase();
            const activeStageId =
              (lead.metadata?.stageId as string) || lead.status;
            const currentStage =
              stages.find((s) => s.id === activeStageId) ?? stages[0];
            const remainingCount = vehicles.length - 1;

            const interactionDays =
              Math.floor(
                (Date.now() - new Date(lead.createdAt).getTime()) /
                  (24 * 60 * 60 * 1000),
              ) || 3;

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
                        <span className="text-[9px] font-black text-accent bg-accent-soft/10 border border-accent/20 rounded px-1.5 py-0.2 w-fit mt-0.5">
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
                    <span className="text-[10px] font-bold text-muted mt-0.5">
                      {lead.buyerPhone || "Sem telefone"}
                    </span>
                  </div>
                </td>

                {/* Fase Column (Dropdown Selector) */}
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <div
                    className="relative inline-block"
                    ref={activeDropdownLeadId === lead.id ? dropdownRef : null}
                  >
                    <button
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider transition-colors cursor-pointer"
                      onClick={() =>
                        setActiveDropdownLeadId(
                          activeDropdownLeadId === lead.id ? null : lead.id,
                        )
                      }
                      style={{
                        backgroundColor: `${currentStage?.color}15`,
                        borderColor: currentStage?.color,
                        color: currentStage?.color,
                      }}
                      type="button"
                    >
                      <span>{currentStage?.name}</span>
                      <ChevronDown className="size-3 shrink-0" />
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
                            onClick={() => void handleStageChange(lead, stg.id)}
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
                  <div className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/5 border border-red-500/10 rounded-lg px-2 py-1 w-fit">
                    <Clock className="size-3 shrink-0" />
                    <span>Última interação há {interactionDays} dias</span>
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
                    <span className="capitalize">
                      {lead.source === "manual" ? "Manual" : lead.source}
                    </span>
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
  );
}
