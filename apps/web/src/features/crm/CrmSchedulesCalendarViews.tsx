import {
  Ban,
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  Link2,
  MessageSquare,
  Pencil,
  Phone,
  Send,
} from "lucide-react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { CrmCalendarMonthGrid, CrmCalendarWeekGrid } from "./CrmCalendarGrid";
import { buildCrmMonthCells, buildCrmWeekDays } from "./crmCalendarModel";
import { formatCycleName } from "./crmConversationModel";
import { formatCrmPhone } from "./crmPhoneFormat";
import type {
  CrmConversationCycle,
  CrmScheduledMessage,
  CrmScheduledMessageStatus,
} from "./crmConversationTypes";

export function MonthGridView({
  conversationCycles,
  currentDate,
  messages,
  onSelectMessage,
  onStartCreation,
}: {
  conversationCycles?: CrmConversationCycle[] | undefined;
  currentDate: Date;
  messages: CrmScheduledMessage[];
  onSelectMessage: (message: CrmScheduledMessage) => void;
  onStartCreation?: ((date?: Date) => void) | undefined;
}) {
  const cells = buildCrmMonthCells(
    currentDate,
    messages,
    (message) => message.scheduledAt,
  );

  return (
    <CrmCalendarMonthGrid
      addLabel={(cell) => `Agendar mensagem para dia ${cell.dayNumber}`}
      cells={cells}
      itemLabels={["envio", "envios"]}
      onStartCreation={onStartCreation}
      renderItems={(cell) => (
        <>
          {cell.items.slice(0, 3).map((message) => {
            const cycle = conversationCycles?.find(
              (c) => String(c.id) === String(message.cycleId),
            );
            const chipTitle = cycle
              ? formatCycleName(cycle)
              : message.content || "Mensagem agendada";
            return (
              <button
                className="crm-calendar-chip"
                data-status={
                  message.status === "sent"
                    ? "confirmed"
                    : message.status === "failed" ||
                        message.status === "cancelled"
                      ? "cancelled"
                      : "scheduled"
                }
                key={message.id}
                onClick={() => onSelectMessage(message)}
                title={`${formatTime(message.scheduledAt)} - ${chipTitle}`}
                type="button"
              >
                <span className="crm-chip-time">
                  {formatTime(message.scheduledAt)}
                </span>
                <span className="crm-chip-title">{chipTitle}</span>
              </button>
            );
          })}
          {cell.items.length > 3 && cell.items[3] ? (
            <button
              className="crm-calendar-more-chip"
              onClick={() => onSelectMessage(cell.items[3]!)}
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
  conversationCycles,
  currentDate,
  messages,
  onSelectMessage,
  onStartCreation,
}: {
  conversationCycles?: CrmConversationCycle[] | undefined;
  currentDate: Date;
  messages: CrmScheduledMessage[];
  onSelectMessage: (message: CrmScheduledMessage) => void;
  onStartCreation?: ((date?: Date) => void) | undefined;
}) {
  const days = buildCrmWeekDays(
    currentDate,
    messages,
    (message) => message.scheduledAt,
  );

  return (
    <CrmCalendarWeekGrid
      addLabel={(day) =>
        `Agendar mensagem para ${day.dayName} ${day.dayNumber}`
      }
      days={days}
      onStartCreation={onStartCreation}
      renderItems={(day) =>
        day.items.length ? (
          day.items.map((message) => {
            const cycle = conversationCycles?.find(
              (c) => String(c.id) === String(message.cycleId),
            );
            return (
              <article
                className="crm-week-visit-card"
                data-status={
                  message.status === "sent"
                    ? "confirmed"
                    : message.status === "failed" ||
                        message.status === "cancelled"
                      ? "cancelled"
                      : "scheduled"
                }
                key={message.id}
                onClick={() => onSelectMessage(message)}
              >
                <div className="crm-week-visit-top">
                  <span className="crm-week-visit-time">
                    <Clock aria-hidden="true" />
                    {formatTime(message.scheduledAt)}
                  </span>
                  <span
                    className="crm-visit-status-badge"
                    data-status={
                      message.status === "sent"
                        ? "confirmed"
                        : message.status === "failed" ||
                            message.status === "cancelled"
                          ? "cancelled"
                          : "scheduled"
                    }
                  >
                    {statusLabel(message.status)}
                  </span>
                </div>

                <div className="crm-week-visit-vehicle">
                  <MessageSquare aria-hidden="true" />
                  <span>
                    {cycle ? formatCycleName(cycle) : message.recipientAddress}
                  </span>
                </div>

                {message.content ? (
                  <p className="crm-week-visit-notes">{message.content}</p>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="crm-week-empty-slot">
            <span>Sem envios</span>
          </div>
        )
      }
    />
  );
}

export function CrmScheduleDetailDialog({
  canCancel,
  canEdit,
  conversationCycles,
  isCancelling,
  message,
  onCancel,
  onClose,
  onEdit,
}: {
  canCancel: boolean;
  canEdit: boolean;
  conversationCycles?: CrmConversationCycle[] | undefined;
  isCancelling: boolean;
  message: CrmScheduledMessage;
  onCancel: (id: string) => Promise<void>;
  onClose: () => void;
  onEdit: (message: CrmScheduledMessage) => void;
}) {
  const cycle = conversationCycles?.find(
    (c) => String(c.id) === String(message.cycleId),
  );
  const sessionLabel = cycle
    ? formatCycleName(cycle)
    : message.recipientAddress
      ? formatCrmPhone(message.recipientAddress)
      : `Sessão ${String(message.cycleId)}`;
  const leadId = cycle?.leadId ?? null;

  return (
    <FeatureDialog
      className="feature-dialog--medium crm-visit-detail-modal"
      footer={
        <div className="crm-visit-actions">
          {canEdit && message.status === "pending" ? (
            <button
              className="crm-visit-action-btn"
              onClick={() => {
                onEdit(message);
                onClose();
              }}
              type="button"
            >
              <Pencil aria-hidden="true" />
              <span>Editar agendamento</span>
            </button>
          ) : null}
          {canCancel && message.status === "pending" ? (
            <button
              aria-label="Cancelar agendamento"
              className="crm-visit-action-btn"
              data-action="cancel"
              disabled={isCancelling}
              onClick={() => {
                void onCancel(message.id).then(() => {
                  onClose();
                });
              }}
              type="button"
            >
              <Ban aria-hidden="true" />
              <span>Cancelar agendamento</span>
            </button>
          ) : null}
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
      title="Detalhes do agendamento"
    >
      <span
        className="crm-visit-status-badge"
        data-status={
          message.status === "sent"
            ? "confirmed"
            : message.status === "failed" || message.status === "cancelled"
              ? "cancelled"
              : "scheduled"
        }
      >
        {statusLabel(message.status)}
      </span>
      <div className="crm-visit-detail-grid">
        <div className="crm-visit-detail-row">
          <span className="crm-visit-detail-label">
            <Clock aria-hidden="true" />
            Data e Horário
          </span>
          <strong className="crm-visit-detail-value">
            {formatFullDateTime(message.scheduledAt)}
          </strong>
        </div>

        <div className="crm-visit-detail-row">
          <span className="crm-visit-detail-label">
            <MessageSquare aria-hidden="true" />
            Conversa / Cliente
          </span>
          <strong className="crm-visit-detail-value">{sessionLabel}</strong>
          {leadId ? (
            <div className="crm-visit-detail-lead-actions">
              <a
                className="crm-visit-lead-link"
                href={`#/crm?surface=leads&leadId=${leadId}`}
                onClick={onClose}
              >
                <span>Abrir ficha do lead</span>
                <ExternalLink aria-hidden="true" />
              </a>
            </div>
          ) : null}
        </div>

        {message.recipientAddress ? (
          <div className="crm-visit-detail-row">
            <span className="crm-visit-detail-label">
              <Phone aria-hidden="true" />
              Telefone de Destino
            </span>
            <strong className="crm-visit-detail-value">
              {formatCrmPhone(message.recipientAddress)}
            </strong>
          </div>
        ) : null}

        <div className="crm-visit-detail-row">
          <span className="crm-visit-detail-label">
            <Send aria-hidden="true" />
            Mensagem
          </span>
          <p className="crm-visit-notes-box">{message.content}</p>
        </div>

        {message.errorMessage ? (
          <div className="crm-visit-detail-row">
            <span className="crm-visit-detail-label">Erro no envio</span>
            <p className="crm-visits-error">{message.errorMessage}</p>
          </div>
        ) : null}
      </div>
    </FeatureDialog>
  );
}

function statusLabel(status: CrmScheduledMessageStatus) {
  const labels: Record<CrmScheduledMessageStatus, string> = {
    cancelled: "Cancelada",
    failed: "Falhou",
    pending: "Agendada",
    sending: "Enviando",
    sent: "Enviada",
  };
  return labels[status] ?? status;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFullDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}
