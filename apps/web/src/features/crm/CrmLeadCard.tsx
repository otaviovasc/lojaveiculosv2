import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  Calendar,
  CalendarCheck,
  Car,
  CheckCircle2,
  Flame,
  Globe,
  Landmark,
  MessageSquare,
  MoreVertical,
  Snowflake,
  Wrench,
  XCircle,
} from "lucide-react";
import { SiWhatsapp } from "@icons-pack/react-simple-icons";
import { formatLeadName } from "./crmPipelineModels";
import { formatLeadTimelineLabel, getLinkedLeadVehicles } from "./crmLeadData";
import { useCrmLeadOwnerName } from "./useCrmLeadOwnerName";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { ProductCrmLead } from "./productCrmTypes";
import { sourceLabels } from "./crmPipelineConfig";
import { readLeadAvatarUrl } from "./crmLeadAvatar";
import {
  cleanPhoneForWhatsapp,
  getQuickScheduleDates,
  isLeadUnread,
  readLeadCrmTags,
  readLeadFinancingBadge,
  readLeadTemperatureBadge,
  readLeadVisitBadge,
} from "./crmLeadCardBadges";

type Props = {
  lead: ProductCrmLead;
  onChatClick: (lead: ProductCrmLead) => void;
  onDragStart: (leadId: string) => void;
  onSelectLead: (leadId: string) => void;
  onSimulateClick?: ((lead: ProductCrmLead) => void) | undefined;
  onQuickScheduleTask?:
    | ((
        leadId: string,
        dueAt: string,
        title?: string | undefined,
      ) => Promise<void>)
    | undefined;
  vehicleOptions: LeadVehicleOption[];
};

export function CrmLeadCard({
  lead,
  onChatClick,
  onDragStart,
  onSelectLead,
  onQuickScheduleTask,
  vehicleOptions,
}: Props) {
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const scheduleContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isScheduleOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        scheduleContainerRef.current &&
        !scheduleContainerRef.current.contains(e.target as Node)
      ) {
        setIsScheduleOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isScheduleOpen]);

  const leadName = formatLeadName(lead).toUpperCase();
  const leadInitials =
    leadName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join("") || "?";
  const vehicles = getLinkedLeadVehicles(lead, vehicleOptions);
  const hasPhone = Boolean(lead.buyerPhone?.trim());
  const cleanPhone = cleanPhoneForWhatsapp(lead.buyerPhone);
  const ownerName = useCrmLeadOwnerName(lead);
  const ownerLabel =
    ownerName === undefined ? "…" : (ownerName ?? "Sem responsável");

  const unread = isLeadUnread(lead);
  const financingBadge = readLeadFinancingBadge(lead.metadata);
  const visitBadge = readLeadVisitBadge(lead.metadata);
  const temperatureBadge = readLeadTemperatureBadge(lead.metadata);
  const crmTags = readLeadCrmTags(lead.metadata);
  const quickScheduleOptions = getQuickScheduleDates();

  const displayVehicles = vehicles.slice(0, 2);
  const remainingCount = vehicles.length - displayVehicles.length;

  const handleDragStart = (event: DragEvent<HTMLElement>) => {
    event.dataTransfer.setData("text/plain", lead.id);
    onDragStart(lead.id);
  };

  return (
    <article
      className={
        "glass-panel-branded shrink-0 p-4 rounded-lg border bg-panel hover:bg-panel hover:shadow-lg transition-all cursor-pointer flex flex-col gap-2.5 group relative overflow-hidden text-left " +
        (unread
          ? "border-accent/60 shadow-sm ring-1 ring-accent/20"
          : "border-line/60")
      }
      draggable
      onClick={() => onSelectLead(lead.id)}
      onDragStart={handleDragStart}
    >
      {/* Defined card header */}
      <header className="-mx-4 -mt-4 rounded-t-[7px] flex items-center gap-2 border-b border-line/50 bg-line/10 px-4 py-2.5">
        <div className="relative shrink-0">
          {readLeadAvatarUrl(lead) ? (
            <img
              alt={leadName}
              className={
                "size-7 rounded-full border object-cover bg-app-elevated " +
                (unread
                  ? "border-accent ring-2 ring-accent/30"
                  : "border-line/50")
              }
              loading="lazy"
              src={readLeadAvatarUrl(lead) as string}
            />
          ) : (
            <span
              className={
                "grid size-7 place-items-center rounded-full border bg-app-elevated text-xs font-black text-app-text " +
                (unread
                  ? "border-accent ring-2 ring-accent/30"
                  : "border-line/50")
              }
            >
              {leadInitials}
            </span>
          )}
          {unread && (
            <span
              aria-label="Nova interação não lida"
              className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-accent animate-pulse ring-2 ring-panel"
              title="Nova interação não lida"
            />
          )}
        </div>

        <h4 className="min-w-0 flex-1 truncate font-black text-xs text-app-text tracking-wider">
          {leadName}
        </h4>

        {/* Direct WhatsApp Web Shortcut */}
        {cleanPhone && (
          <button
            aria-label={`Conversar com ${formatLeadName(lead)} no WhatsApp Web`}
            className="p-1 rounded hover:bg-success-soft/25 text-success-strong hover:text-success-strong cursor-pointer shrink-0 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              window.open(
                `https://wa.me/${cleanPhone}`,
                "_blank",
                "noopener,noreferrer",
              );
            }}
            title="Conversar no WhatsApp Web"
            type="button"
          >
            <SiWhatsapp
              aria-hidden="true"
              className="size-3.5 fill-current text-success-strong"
            />
          </button>
        )}

        {/* Internal CRM Chat Modal */}
        <button
          aria-label={
            hasPhone
              ? `Abrir chat no CRM de ${formatLeadName(lead)}`
              : `${formatLeadName(lead)} não tem telefone para chat`
          }
          className="p-1 rounded hover:bg-line/20 text-muted hover:text-app-text cursor-pointer shrink-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted transition-colors"
          disabled={!hasPhone}
          onClick={(e) => {
            e.stopPropagation();
            if (hasPhone) onChatClick(lead);
          }}
          title={
            hasPhone ? "Abrir chat no CRM" : "Lead sem telefone cadastrado"
          }
          type="button"
        >
          <MessageSquare aria-hidden="true" className="size-3.5" />
        </button>

        {/* Quick Schedule Follow-up Popover */}
        <div className="relative" ref={scheduleContainerRef}>
          <button
            aria-expanded={isScheduleOpen}
            aria-label={`Agendar retorno para ${formatLeadName(lead)}`}
            className={
              "p-1 rounded cursor-pointer shrink-0 transition-colors " +
              (isScheduleOpen
                ? "bg-accent/15 text-accent"
                : "hover:bg-line/20 text-muted hover:text-app-text")
            }
            onClick={(e) => {
              e.stopPropagation();
              setIsScheduleOpen((prev) => !prev);
            }}
            title="Agendamento rápido"
            type="button"
          >
            <Calendar aria-hidden="true" className="size-3.5" />
          </button>
          {isScheduleOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-xl border border-line bg-panel p-1.5 shadow-2xl text-app-text"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-xs font-black uppercase tracking-wider text-muted">
                Agendar retorno
              </div>
              {quickScheduleOptions.map((opt) => (
                <button
                  className="w-full text-left px-2.5 py-1.5 text-xs font-bold rounded-sm text-app-text hover:bg-line/15 hover:text-app-text transition-colors cursor-pointer flex items-center justify-between"
                  key={opt.label}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsScheduleOpen(false);
                    void onQuickScheduleTask?.(
                      lead.id,
                      opt.dueAt,
                      "Retornar contato",
                    );
                  }}
                  type="button"
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details action button */}
        <button
          aria-label={`Abrir detalhes de ${formatLeadName(lead)}`}
          className="p-1 rounded hover:bg-line/20 text-muted hover:text-app-text cursor-pointer shrink-0 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onSelectLead(lead.id);
          }}
          type="button"
        >
          <MoreVertical aria-hidden="true" className="size-3.5" />
        </button>
      </header>

      {/* Last interaction timestamp */}
      <div className="flex items-center gap-1 text-xs font-bold leading-none text-muted">
        <span>{formatLeadTimelineLabel(lead)}</span>
      </div>

      {/* High-Impact Badges: Scheduled Visit */}
      {visitBadge && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
          <CalendarCheck className="size-3.5 shrink-0" />
          <span className="truncate flex-1">
            Visita: {visitBadge.datetimeFormatted}
          </span>
          {visitBadge.vehicleLabel && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 truncate max-w-[100px]">
              {visitBadge.vehicleLabel}
            </span>
          )}
        </div>
      )}

      {/* High-Impact Badges: Financing Status */}
      {financingBadge && (
        <div className="flex items-center gap-1.5">
          <span
            className={
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border " +
              (financingBadge.status === "approved"
                ? "bg-success-soft/20 text-success-strong border-success-strong/30"
                : financingBadge.status === "rejected"
                  ? "bg-danger-soft/20 text-danger-strong border-danger-strong/30"
                  : "bg-warning-soft/20 text-warning-strong border-warning-strong/30")
            }
          >
            {financingBadge.status === "approved" && (
              <CheckCircle2 className="size-3 shrink-0" />
            )}
            {financingBadge.status === "rejected" && (
              <XCircle className="size-3 shrink-0" />
            )}
            {financingBadge.status === "pending" && (
              <Landmark className="size-3 shrink-0" />
            )}
            <span className="truncate">
              {financingBadge.label}
              {financingBadge.bank ? ` · ${financingBadge.bank}` : ""}
            </span>
            {financingBadge.amountFormatted && (
              <span className="ml-0.5 text-xs font-black opacity-90">
                ({financingBadge.amountFormatted})
              </span>
            )}
          </span>
        </div>
      )}

      {/* High-Impact Badges: Lead Temperature & CRM Tags */}
      {(temperatureBadge || crmTags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1">
          {temperatureBadge && (
            <span
              className={
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-black border " +
                (temperatureBadge.type === "hot"
                  ? "bg-danger-soft/20 text-danger-strong border-danger-strong/30"
                  : temperatureBadge.type === "cold"
                    ? "bg-info-soft/20 text-info-strong border-info-strong/30"
                    : "bg-purple-500/15 text-purple-500 dark:text-purple-400 border-purple-500/30")
              }
            >
              {temperatureBadge.type === "hot" && (
                <Flame className="size-2.5 fill-current" />
              )}
              {temperatureBadge.type === "cold" && (
                <Snowflake className="size-2.5" />
              )}
              {temperatureBadge.type === "after_sale" && (
                <Wrench className="size-2.5" />
              )}
              <span>{temperatureBadge.label}</span>
            </span>
          )}
          {crmTags.map((t) => (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold border border-line/40 bg-line/15 text-app-text"
              key={t.id || t.name}
              style={
                t.color
                  ? {
                      backgroundColor: `${t.color}20`,
                      borderColor: `${t.color}50`,
                      color: t.color,
                    }
                  : undefined
              }
            >
              {t.emoji && <span>{t.emoji}</span>}
              <span>{t.name}</span>
            </span>
          ))}
        </div>
      )}

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
          <span>{ownerLabel}</span>
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
    </article>
  );
}
