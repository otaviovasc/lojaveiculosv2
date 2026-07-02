import {
  Clock,
  DollarSign,
  Car,
  Globe,
  MessageSquare,
  MoreVertical,
} from "lucide-react";
import type { DragEvent, MouseEvent } from "react";
import { formatLeadName } from "./crmPipelineModels";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { ProductCrmLead } from "./productCrmTypes";

type Props = {
  lead: ProductCrmLead;
  onDragStart: (leadId: string) => void;
  onSelectLead: (leadId: string) => void;
  onSimulateClick: (lead: ProductCrmLead) => void;
  vehicleOptions: LeadVehicleOption[];
};

export function CrmLeadCard({
  lead,
  onDragStart,
  onSelectLead,
  onSimulateClick,
  vehicleOptions,
}: Props) {
  const leadName = formatLeadName(lead).toUpperCase();

  const listingIds: string[] = Array.isArray(lead.metadata?.listingIds)
    ? (lead.metadata.listingIds as string[])
    : lead.listingId
      ? [lead.listingId]
      : [];

  const vehicles = listingIds
    .map((id) => vehicleOptions.find((v) => v.id === id))
    .filter((v): v is LeadVehicleOption => !!v);

  const displayVehicles = vehicles.slice(0, 2);
  const remainingCount = vehicles.length - displayVehicles.length;

  const handleDragStart = (event: DragEvent<HTMLElement>) => {
    event.dataTransfer.setData("text/plain", lead.id);
    onDragStart(lead.id);
  };

  const handleSimulate = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onSimulateClick(lead);
  };

  const interactionDays =
    Math.floor(
      (Date.now() - new Date(lead.createdAt).getTime()) / (24 * 60 * 60 * 1000),
    ) || 3;

  return (
    <article
      className="glass-panel-branded p-4 rounded-lg border border-line/60 bg-panel hover:bg-panel hover:shadow-lg transition-all cursor-pointer flex flex-col gap-2.5 group relative overflow-hidden text-left"
      draggable
      onClick={() => onSelectLead(lead.id)}
      onDragStart={handleDragStart}
    >
      {/* Name and actions row */}
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-black text-xs text-app-text tracking-wider truncate">
          {leadName}
        </h4>
        <button
          className="p-1 rounded hover:bg-line/20 text-muted hover:text-app-text cursor-pointer shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onSelectLead(lead.id);
          }}
          type="button"
        >
          <MoreVertical className="size-3.5" />
        </button>
      </div>

      {/* SLA warning indicator */}
      <div className="text-[10px] font-bold text-red-500 flex items-center gap-1 leading-none">
        <span>Última interação há {interactionDays} dias</span>
      </div>

      {/* Vehicle of interest small cards side-by-side */}
      {vehicles.length > 0 && (
        <div className="flex flex-col gap-1 my-1">
          <div
            className={
              "grid gap-1.5 " +
              (displayVehicles.length === 1 ? "grid-cols-1" : "grid-cols-2")
            }
          >
            {displayVehicles.map((v) => {
              const formattedPrice = v.priceCents
                ? new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  }).format(v.priceCents / 100)
                : null;
              return (
                <div
                  className="flex items-center gap-1.5 p-1 rounded bg-line/10 border border-line/30 hover:bg-line/20 transition-all min-w-0"
                  key={v.id}
                >
                  <div className="size-7 rounded bg-app-elevated flex items-center justify-center border border-line/45 overflow-hidden shrink-0">
                    {v.imageUrl ? (
                      <img
                        alt={v.label}
                        className="size-full object-cover"
                        src={v.imageUrl}
                      />
                    ) : (
                      <Car className="size-3.5 text-muted shrink-0" />
                    )}
                  </div>
                  <div className="flex-grow min-w-0 flex flex-col justify-center">
                    <span className="text-[9px] font-black text-app-text truncate leading-tight">
                      {v.label}
                    </span>
                    {(formattedPrice || v.detail) && (
                      <span className="text-[8px] font-bold text-muted truncate mt-0.5 leading-none">
                        {formattedPrice
                          ? formattedPrice
                          : v.detail || v.manufactureYear || ""}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {remainingCount > 0 && (
            <div className="text-[8px] font-black text-accent bg-accent-soft/10 border border-accent/20 rounded px-1.5 py-0.5 w-fit mt-0.5 self-end">
              +{remainingCount} {remainingCount === 1 ? "carro" : "carros"}
            </div>
          )}
        </div>
      )}

      {/* Bottom Owner and Source Row */}
      <div className="flex items-center justify-between gap-2 border-t border-line/20 pt-2 mt-1">
        <div className="min-w-0 flex items-center gap-1 text-[10px] font-bold text-muted truncate">
          <span>Kauan Massuia</span>
          <span>·</span>
          <span className="truncate">DMS multimarcas</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-muted">
          {lead.source === "whatsapp" ? (
            <MessageSquare className="size-3 text-emerald-500" />
          ) : (
            <Globe className="size-3" />
          )}
        </div>
      </div>

      {/* Low-profile Simulation Button */}
      <button
        className="w-full inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border border-line/60 bg-app-elevated px-3 text-[10px] font-black text-app-text hover:bg-line/25 cursor-pointer transition-colors mt-0.5"
        onClick={handleSimulate}
        type="button"
      >
        <DollarSign className="size-3 text-emerald-500 shrink-0" />
        <span>Simular Financiamento</span>
      </button>
    </article>
  );
}
