import {
  DollarSign,
  Car,
  Globe,
  MessageSquare,
  MoreVertical,
} from "lucide-react";
import type { DragEvent, MouseEvent } from "react";
import { formatLeadName } from "./crmPipelineModels";
import {
  formatLeadOwner,
  formatLeadTimelineLabel,
  getLinkedLeadVehicles,
} from "./crmLeadData";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { ProductCrmLead } from "./productCrmTypes";
import { sourceLabels } from "./crmPipelineConfig";

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
  const leadInitials =
    leadName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join("") || "?";
  const vehicles = getLinkedLeadVehicles(lead, vehicleOptions);

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

  return (
    <article
      className="glass-panel-branded shrink-0 p-4 rounded-lg border border-line/60 bg-panel hover:bg-panel hover:shadow-lg transition-all cursor-pointer flex flex-col gap-2.5 group relative overflow-hidden text-left"
      draggable
      onClick={() => onSelectLead(lead.id)}
      onDragStart={handleDragStart}
    >
      {/* Defined card header */}
      <header className="-mx-4 -mt-4 flex items-center gap-2 border-b border-line/50 bg-line/10 px-4 py-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line/50 bg-app-elevated text-xs font-black text-app-text">
          {leadInitials}
        </span>
        <h4 className="min-w-0 flex-1 truncate font-black text-xs text-app-text tracking-wider">
          {leadName}
        </h4>
        <button
          aria-label={`Abrir detalhes de ${formatLeadName(lead)}`}
          className="p-1 rounded hover:bg-line/20 text-muted hover:text-app-text cursor-pointer shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onSelectLead(lead.id);
          }}
          type="button"
        >
          <MoreVertical aria-hidden="true" className="size-3.5" />
        </button>
      </header>

      {/* SLA warning indicator */}
      <div className="flex items-center gap-1 text-xs font-bold leading-none text-danger">
        <span>{formatLeadTimelineLabel(lead)}</span>
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
                    <span className="text-xs font-black text-app-text truncate leading-tight">
                      {v.label}
                    </span>
                    {(formattedPrice || v.detail) && (
                      <span className="text-xs font-bold text-muted truncate mt-0.5 leading-none">
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
            <div className="text-xs font-black text-accent bg-accent-soft/10 border border-accent/20 rounded px-1.5 py-0.5 w-fit mt-0.5 self-end">
              +{remainingCount} {remainingCount === 1 ? "carro" : "carros"}
            </div>
          )}
        </div>
      )}

      {/* Bottom Owner and Source Row */}
      <div className="flex items-center justify-between gap-2 border-t border-line/20 pt-2 mt-1">
        <div className="min-w-0 flex items-center gap-1 text-xs font-bold text-muted truncate">
          <span>{formatLeadOwner(lead)}</span>
          <span>·</span>
          <span className="truncate">{sourceLabels[lead.source]}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-muted">
          {lead.source === "whatsapp" ? (
            <MessageSquare className="size-3 text-success-strong" />
          ) : (
            <Globe className="size-3" />
          )}
        </div>
      </div>

      {/* Low-profile Simulation Button */}
      <button
        className="w-full inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border border-line/60 bg-app-elevated px-3 text-xs font-black text-app-text hover:bg-line/25 cursor-pointer transition-colors mt-0.5"
        onClick={handleSimulate}
        type="button"
      >
        <DollarSign
          aria-hidden="true"
          className="size-3 shrink-0 text-success-strong"
        />
        <span>Simular financiamento</span>
      </button>
    </article>
  );
}
