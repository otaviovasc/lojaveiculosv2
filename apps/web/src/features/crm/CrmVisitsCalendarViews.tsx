import {
  Calendar as CalendarIcon,
  CarFront,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link2,
  X,
} from "lucide-react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { CrmCalendarMonthGrid, CrmCalendarWeekGrid } from "./CrmCalendarGrid";
import { buildCrmMonthCells, buildCrmWeekDays } from "./crmCalendarModel";
import type { CrmLeadVisit, LeadVisitStatus } from "./crmVisitsApi";

export function MonthGridView({
  currentDate,
  onSelectVisit,
  onStartCreation,
  visits,
}: {
  currentDate: Date;
  onSelectVisit: (visit: CrmLeadVisit) => void;
  onStartCreation?: ((date?: Date) => void) | undefined;
  visits: CrmLeadVisit[];
}) {
  const cells = buildCrmMonthCells(
    currentDate,
    visits,
    (visit) => visit.scheduledAt,
  );

  return (
    <CrmCalendarMonthGrid
      addLabel={(cell) => `Agendar visita para dia ${cell.dayNumber}`}
      cells={cells}
      itemLabels={["visita", "visitas"]}
      onStartCreation={onStartCreation}
      renderItems={(cell) => (
        <>
          {cell.items.slice(0, 3).map((visit) => (
            <button
              className="crm-calendar-chip"
              data-status={visit.status}
              key={visit.id}
              onClick={() => onSelectVisit(visit)}
              title={`${formatTime(visit.scheduledAt)} - ${visit.vehicleTitle ?? "Visita"}`}
              type="button"
            >
              <span className="crm-chip-time">
                {formatTime(visit.scheduledAt)}
              </span>
              <span className="crm-chip-title">
                {visit.vehicleTitle ??
                  (visit.notes
                    ? visit.notes.slice(0, 24)
                    : "Visita presencial")}
              </span>
            </button>
          ))}
          {cell.items.length > 3 && cell.items[3] ? (
            <button
              className="crm-calendar-more-chip"
              onClick={() => onSelectVisit(cell.items[3]!)}
              type="button"
            >
              +{cell.items.length - 3} mais
            </button>
          ) : null}
        </>
      )}
    />
  );
}

export function WeekGridView({
  currentDate,
  onSelectVisit,
  onStartCreation,
  visits,
}: {
  currentDate: Date;
  onSelectVisit: (visit: CrmLeadVisit) => void;
  onStartCreation?: ((date?: Date) => void) | undefined;
  visits: CrmLeadVisit[];
}) {
  const days = buildCrmWeekDays(
    currentDate,
    visits,
    (visit) => visit.scheduledAt,
  );

  return (
    <CrmCalendarWeekGrid
      addLabel={(day) => `Agendar visita para ${day.dayName} ${day.dayNumber}`}
      days={days}
      onStartCreation={onStartCreation}
      renderItems={(day) =>
        day.items.length ? (
          day.items.map((visit) => (
            <article
              className="crm-week-visit-card"
              data-status={visit.status}
              key={visit.id}
              onClick={() => onSelectVisit(visit)}
            >
              <div className="crm-week-visit-top">
                <span className="crm-week-visit-time">
                  <Clock aria-hidden="true" />
                  {formatTime(visit.scheduledAt)}
                </span>
                <span
                  className="crm-visit-status-badge"
                  data-status={visit.status}
                >
                  {statusLabel(visit.status)}
                </span>
              </div>
              {visit.vehicleTitle ? (
                <div className="crm-week-visit-vehicle">
                  <CarFront aria-hidden="true" />
                  <span>{visit.vehicleTitle}</span>
                </div>
              ) : null}
              {visit.notes ? (
                <p className="crm-week-visit-notes">{visit.notes}</p>
              ) : null}
            </article>
          ))
        ) : (
          <div className="crm-week-empty-slot">
            <span>Sem visitas</span>
          </div>
        )
      }
    />
  );
}

export function CrmVisitDetailDialog({
  canManage,
  isSaving,
  onClose,
  onStatus,
  visit,
}: {
  canManage: boolean;
  isSaving: boolean;
  onClose: () => void;
  onStatus: (visit: CrmLeadVisit, status: LeadVisitStatus) => void;
  visit: CrmLeadVisit;
}) {
  return (
    <FeatureDialog
      className="feature-dialog--medium crm-visit-detail-modal"
      footer={
        <div className="crm-visit-actions">
          <button
            aria-label="Confirmar visita"
            className="crm-visit-action-btn"
            data-action="confirm"
            disabled={!canManage || isSaving || visit.status === "confirmed"}
            onClick={() => onStatus(visit, "confirmed")}
            type="button"
          >
            <Check aria-hidden="true" />
            <span>Confirmar</span>
          </button>
          <button
            aria-label="Concluir visita"
            className="crm-visit-action-btn"
            data-action="complete"
            disabled={!canManage || isSaving || visit.status === "completed"}
            onClick={() => onStatus(visit, "completed")}
            type="button"
          >
            <CheckCircle2 aria-hidden="true" />
            <span>Concluir</span>
          </button>
          <button
            aria-label="Cancelar visita"
            className="crm-visit-action-btn"
            data-action="cancel"
            disabled={!canManage || isSaving || visit.status === "cancelled"}
            onClick={() => onStatus(visit, "cancelled")}
            type="button"
          >
            <X aria-hidden="true" />
            <span>Cancelar</span>
          </button>
          <button
            className="crm-action crm-action-secondary"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        </div>
      }
      icon={<CalendarIcon />}
      isOpen
      onClose={onClose}
      title="Detalhes da visita"
    >
      <span className="crm-visit-status-badge" data-status={visit.status}>
        {statusLabel(visit.status)}
      </span>
      <div className="crm-visit-detail-grid">
        <div className="crm-visit-detail-row">
          <span className="crm-visit-detail-label">
            <Clock aria-hidden="true" />
            Data e Horário
          </span>
          <strong className="crm-visit-detail-value">
            {formatFullDateTime(visit.scheduledAt)}
          </strong>
        </div>

        <div className="crm-visit-detail-row">
          <span className="crm-visit-detail-label">
            <Link2 aria-hidden="true" />
            Lead Vinculado
          </span>
          <div className="crm-visit-detail-lead-actions">
            <a
              className="crm-visit-lead-link"
              href={`#/crm?surface=leads&leadId=${visit.leadId}`}
              onClick={onClose}
            >
              <span>Abrir ficha do lead</span>
              <ExternalLink aria-hidden="true" />
            </a>
          </div>
        </div>

        {visit.vehicleTitle ? (
          <div className="crm-visit-detail-row">
            <span className="crm-visit-detail-label">
              <CarFront aria-hidden="true" />
              Veículo de Interesse
            </span>
            <div className="crm-visit-vehicle-chip">
              <CarFront aria-hidden="true" />
              <strong>{visit.vehicleTitle}</strong>
            </div>
          </div>
        ) : null}

        {visit.notes ? (
          <div className="crm-visit-detail-row">
            <span className="crm-visit-detail-label">Observações</span>
            <p className="crm-visit-notes-box">{visit.notes}</p>
          </div>
        ) : null}
      </div>
    </FeatureDialog>
  );
}

export function statusLabel(status: LeadVisitStatus) {
  const labels: Record<LeadVisitStatus, string> = {
    cancelled: "Cancelada",
    completed: "Concluída",
    confirmed: "Confirmada",
    no_show: "Não compareceu",
    scheduled: "Agendada",
  };
  return labels[status];
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatFullDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}
