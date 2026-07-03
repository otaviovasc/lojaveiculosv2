import { Clock, MessageSquare, Phone } from "lucide-react";
import type { DragEvent, MouseEvent } from "react";
import {
  formatLeadContact,
  formatLeadName,
  formatRelativeDate,
} from "./crmPipelineModels";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { ProductCrmLead } from "./productCrmTypes";

type CrmKanbanLeadCardProps = {
  lead: ProductCrmLead;
  onDragStart: (leadId: string) => void;
  onSelectLead: (leadId: string) => void;
  vehicleOptions: LeadVehicleOption[];
};

export function CrmKanbanLeadCard({
  lead,
  onDragStart,
  onSelectLead,
  vehicleOptions,
}: CrmKanbanLeadCardProps) {
  const vehicle = vehicleOptions.find((option) => option.id === lead.listingId);
  const title = vehicle?.label ?? lead.vehicleTitle ?? formatLeadName(lead);
  const detail = vehicle?.detail ?? formatLeadContact(lead);
  const price = formatPrice(vehicle?.priceCents);
  const year = formatVehicleYear(vehicle);
  const leadName = formatLeadName(lead);

  const handleDragStart = (event: DragEvent<HTMLElement>) => {
    event.dataTransfer.setData("text/plain", lead.id);
    onDragStart(lead.id);
  };

  const openWhatsApp = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const phone = lead.buyerPhone?.replace(/\D/g, "");
    if (!phone) return;
    window.open(`https://wa.me/${phone}`, "_blank", "noopener,noreferrer");
  };

  return (
    <article
      className="crm-client-card"
      draggable
      onDragStart={handleDragStart}
    >
      {vehicle?.imageUrl ? (
        <div className="crm-client-vehicle-media">
          <img alt={vehicle.label} src={vehicle.imageUrl} />
          <span className="crm-client-vehicle-badge">Estoque próprio</span>
          <span className="crm-client-live-dot" />
          <div className="crm-client-vehicle-caption">{detail}</div>
        </div>
      ) : null}

      <div className="crm-client-card-heading">
        <button
          className="crm-client-card-title"
          onClick={() => onSelectLead(lead.id)}
          type="button"
        >
          {title}
        </button>
        <span>{year}</span>
      </div>

      <div className="crm-client-card-line">
        <strong>{price}</strong>
        <span>{detail}</span>
      </div>

      <div className="crm-client-card-meta">
        <span>
          <Clock aria-hidden="true" className="size-3" />
          {formatRelativeDate(lead.createdAt)}
        </span>
        {lead.buyerPhone ? (
          <span>
            <Phone aria-hidden="true" className="size-3" />
            {lead.buyerPhone}
          </span>
        ) : null}
      </div>

      <div className="crm-client-card-client">
        <span>Cliente</span>
        <button onClick={() => onSelectLead(lead.id)} type="button">
          {leadName}
        </button>
      </div>

      <div className="crm-client-card-actions">
        <button
          className="crm-client-inline-action"
          onClick={() => onSelectLead(lead.id)}
          type="button"
        >
          Ver cliente
        </button>
        {lead.buyerPhone ? (
          <button
            aria-label={`Abrir WhatsApp de ${leadName}`}
            className="crm-client-icon-action"
            onClick={openWhatsApp}
            title={`Abrir WhatsApp de ${leadName}`}
            type="button"
          >
            <MessageSquare aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>
    </article>
  );
}

function formatPrice(priceCents: number | null | undefined) {
  if (!priceCents) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(priceCents / 100);
}

function formatVehicleYear(vehicle: LeadVehicleOption | undefined) {
  if (!vehicle?.manufactureYear || !vehicle.modelYear)
    return "Ano não informado";
  return `${vehicle.manufactureYear}/${vehicle.modelYear}`;
}
