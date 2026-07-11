import { CalendarClock, Loader2, RefreshCw, Send } from "lucide-react";
import { CrmSelect } from "./CrmFormControls";
import { formatSessionName } from "./crmWhatsappModel";
import type {
  CrmWhatsappScheduledMessage,
  CrmWhatsappScheduledMessageStatus,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";

export type ScheduleStatusFilter = CrmWhatsappScheduledMessageStatus | "all";
export type ScheduleStatusCounts = Record<ScheduleStatusFilter, number>;

const statusOptions: Array<{ label: string; value: ScheduleStatusFilter }> = [
  { label: "Todas", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Enviando", value: "sending" },
  { label: "Enviadas", value: "sent" },
  { label: "Falhas", value: "failed" },
  { label: "Canceladas", value: "cancelled" },
];

export function createScheduleStatusCounts(
  messages: CrmWhatsappScheduledMessage[],
): ScheduleStatusCounts {
  const counts: ScheduleStatusCounts = {
    all: messages.length,
    cancelled: 0,
    failed: 0,
    pending: 0,
    sending: 0,
    sent: 0,
  };
  for (const message of messages) counts[message.status] += 1;
  return counts;
}

export function ScheduleCreateForm({
  canCreate,
  canSave,
  isSaving,
  onSave,
  onScheduledAtChange,
  onTargetSessionChange,
  onTextChange,
  scheduledAt,
  sessions,
  targetSessionId,
  text,
}: {
  canCreate: boolean;
  canSave: boolean;
  isSaving: boolean;
  onSave: () => void;
  onScheduledAtChange: (value: string) => void;
  onTargetSessionChange: (value: string) => void;
  onTextChange: (value: string) => void;
  scheduledAt: string;
  sessions: CrmWhatsappSession[];
  targetSessionId: string;
  text: string;
}) {
  return (
    <section className="crm-whatsapp-schedule-form" aria-label="Criar">
      <div className="crm-whatsapp-schedule-form-heading">
        <CalendarClock aria-hidden="true" />
        <strong>Novo agendamento</strong>
      </div>
      {canCreate ? (
        <>
          <label>
            Conversa
            <CrmSelect
              ariaLabel="Conversa"
              className="crm-whatsapp-select"
              disabled={isSaving}
              onChange={onTargetSessionChange}
              options={createSessionOptions(sessions)}
              value={targetSessionId}
            />
          </label>
          <label>
            Quando enviar
            <input
              disabled={isSaving || !targetSessionId}
              min={readMinDateTimeLocal()}
              onChange={(event) => onScheduledAtChange(event.target.value)}
              type="datetime-local"
              value={scheduledAt}
            />
          </label>
          <label>
            Mensagem
            <textarea
              disabled={isSaving || !targetSessionId}
              maxLength={4000}
              onChange={(event) => onTextChange(event.target.value)}
              rows={5}
              value={text}
            />
          </label>
          <button
            className="crm-action"
            disabled={!canSave}
            onClick={onSave}
            type="button"
          >
            <Send aria-hidden="true" />
            Agendar mensagem
          </button>
        </>
      ) : (
        <p className="crm-whatsapp-schedule-empty">
          Sem permissao para criar agendamentos.
        </p>
      )}
    </section>
  );
}

export function ScheduleToolbar({
  activeSession,
  canProcess,
  canRead,
  isLoading,
  isProcessing,
  onProcessDue,
  onRefresh,
  onSessionFilterChange,
  onStatusFilterChange,
  sessionFilter,
  sessions,
  statusCounts,
  statusFilter,
}: {
  activeSession: CrmWhatsappSession | null;
  canProcess: boolean;
  canRead: boolean;
  isLoading: boolean;
  isProcessing: boolean;
  onProcessDue: () => void;
  onRefresh: () => void;
  onSessionFilterChange: (value: string) => void;
  onStatusFilterChange: (value: ScheduleStatusFilter) => void;
  sessionFilter: string;
  sessions: CrmWhatsappSession[];
  statusCounts: ScheduleStatusCounts;
  statusFilter: ScheduleStatusFilter;
}) {
  return (
    <div className="crm-whatsapp-schedule-toolbar">
      <div
        aria-label="Filtrar agendamentos por status"
        className="crm-whatsapp-schedule-tabs"
        role="tablist"
      >
        {statusOptions.map((option) => (
          <button
            aria-selected={statusFilter === option.value}
            className={
              statusFilter === option.value
                ? "crm-whatsapp-schedule-tab crm-whatsapp-schedule-tab-active"
                : "crm-whatsapp-schedule-tab"
            }
            disabled={!canRead || isLoading}
            key={option.value}
            onClick={() => onStatusFilterChange(option.value)}
            role="tab"
            type="button"
          >
            {option.label}
            <span>{statusCounts[option.value] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="crm-whatsapp-schedule-toolbar-controls">
        <CrmSelect
          ariaLabel="Filtrar agendamentos por conversa"
          className="crm-whatsapp-select"
          disabled={!canRead || isLoading}
          onChange={onSessionFilterChange}
          options={filterSessionOptions(sessions, activeSession)}
          value={sessionFilter}
        />
        {canRead ? (
          <button
            className="crm-action crm-action-muted"
            disabled={isLoading}
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw aria-hidden="true" />
            Atualizar
          </button>
        ) : null}
        {canProcess ? (
          <button
            className="crm-action crm-action-muted"
            disabled={isProcessing}
            onClick={onProcessDue}
            type="button"
          >
            {isProcessing ? <Loader2 aria-hidden="true" /> : null}
            Processar vencidas
          </button>
        ) : null}
      </div>
    </div>
  );
}

function formatScheduleSessionLabel(session: CrmWhatsappSession) {
  const lead = session.leadId ? ` - lead ${session.leadId}` : "";
  return `${formatSessionName(session)}${lead}`;
}

function createSessionOptions(sessions: CrmWhatsappSession[]) {
  return [
    { label: "Selecione uma conversa", value: "" },
    ...sessions.map((session) => ({
      label: formatScheduleSessionLabel(session),
      value: String(session.id),
    })),
  ];
}

function filterSessionOptions(
  sessions: CrmWhatsappSession[],
  activeSession: CrmWhatsappSession | null,
) {
  return [
    { label: "Todas as conversas", value: "all" },
    ...(activeSession
      ? [{ label: "Conversa ativa", value: String(activeSession.id) }]
      : []),
    ...sessions
      .filter(
        (session) =>
          !activeSession || String(session.id) !== String(activeSession.id),
      )
      .map((session) => ({
        label: formatScheduleSessionLabel(session),
        value: String(session.id),
      })),
  ];
}

function readMinDateTimeLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  return toDateTimeLocalValue(now);
}

function toDateTimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join("T");
}
