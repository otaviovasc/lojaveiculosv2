import {
  Ban,
  Calendar as CalendarIcon,
  CalendarCheck,
  CalendarClock,
  Check,
  Clock,
  Link2,
  List,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  X,
  Zap,
} from "lucide-react";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { formatCycleName } from "./crmConversationModel";
import { formatCrmPhone } from "./crmPhoneFormat";
import type {
  CrmConversationCycle,
  CrmScheduledMessage,
  CrmScheduledMessageStatus,
} from "./crmConversationTypes";

export type ScheduleView =
  | "all"
  | "cancelled"
  | "failed"
  | "pending"
  | "sent"
  | "today"
  | "tomorrow"
  | "upcoming";

export type ScheduleStatusFilter = CrmScheduledMessageStatus | "all";
export type ScheduleStatusCounts = Record<ScheduleStatusFilter, number>;

export const scheduleViewLabels: Record<ScheduleView, string> = {
  today: "Hoje",
  tomorrow: "Amanhã",
  upcoming: "Próximas",
  pending: "Pendentes",
  sent: "Enviadas",
  failed: "Falhas",
  cancelled: "Canceladas",
  all: "Todas",
};

export function SchedulePageHeader({
  canCreate,
  displayMode,
  isLoading,
  onDisplayModeChange,
  onRefresh,
  onStart,
}: {
  canCreate: boolean;
  displayMode: "board" | "calendar";
  isLoading: boolean;
  onDisplayModeChange: (value: "board" | "calendar") => void;
  onRefresh: () => void;
  onStart: () => void;
}) {
  return (
    <header className="crm-schedules-header crm-visits-header">
      <span aria-hidden="true" className="crm-visits-header-icon">
        <CalendarClock />
      </span>
      <div className="crm-visits-header-text">
        <span className="crm-visits-eyebrow">
          <CalendarClock aria-hidden="true" />
          Agenda operacional
        </span>
        <h2>Agendamento de mensagens</h2>
        <p>
          Programe follow-ups e lembretes sem perder o contexto do atendimento.
        </p>
      </div>
      <div className="crm-visits-header-actions">
        <div
          aria-label="Visualização dos agendamentos"
          className="crm-visits-view-type-toggle"
          role="group"
        >
          <button
            aria-pressed={displayMode === "board"}
            className={`crm-visits-view-btn${displayMode === "board" ? " active" : ""}`}
            onClick={() => onDisplayModeChange("board")}
            type="button"
          >
            <List aria-hidden="true" />
            <span>Lista</span>
          </button>
          <button
            aria-pressed={displayMode === "calendar"}
            className={`crm-visits-view-btn${displayMode === "calendar" ? " active" : ""}`}
            onClick={() => onDisplayModeChange("calendar")}
            type="button"
          >
            <CalendarIcon aria-hidden="true" />
            <span>Calendário</span>
          </button>
        </div>
        <button
          aria-label="Atualizar agendamentos"
          className="crm-visits-refresh"
          disabled={isLoading}
          onClick={onRefresh}
          title="Atualizar agendamentos"
          type="button"
        >
          <RefreshCw
            aria-hidden="true"
            className={isLoading ? "animate-spin" : undefined}
          />
        </button>
        <button
          className="crm-action"
          disabled={!canCreate}
          onClick={onStart}
          type="button"
        >
          <Plus aria-hidden="true" />
          Novo agendamento
        </button>
      </div>
    </header>
  );
}

export const scheduleViewOrder: ScheduleView[] = [
  "today",
  "tomorrow",
  "upcoming",
  "pending",
  "sent",
  "failed",
  "cancelled",
  "all",
];

export function createScheduleStatusCounts(
  messages: CrmScheduledMessage[],
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

export function countSchedulesByView(
  messages: CrmScheduledMessage[],
): Record<ScheduleView, number> {
  return Object.fromEntries(
    scheduleViewOrder.map((view) => [
      view,
      messages.filter((m) => scheduleMatchesView(m, view)).length,
    ]),
  ) as Record<ScheduleView, number>;
}

export function schedulesForView(
  messages: CrmScheduledMessage[],
  view: ScheduleView,
) {
  return messages.filter((m) => scheduleMatchesView(m, view));
}

export function ScheduleBoard({
  activeView,
  canCancel,
  canEdit,
  canProcess,
  canRead,
  cancellingId,
  confirmingCancelId,
  conversationCycles,
  error,
  isLoading,
  isProcessing,
  messages,
  onCancel,
  onCancelRequest,
  onDismissCancel,
  onEdit,
  onProcessDue,
  onSessionFilterChange,
  onViewChange,
  sessionFilter,
  successMessage,
  viewCounts,
}: {
  activeView: ScheduleView;
  canCancel: boolean;
  canEdit: boolean;
  canProcess: boolean;
  canRead: boolean;
  cancellingId: string | null;
  confirmingCancelId: string | null;
  conversationCycles: CrmConversationCycle[];
  error: string | null;
  isLoading: boolean;
  isProcessing: boolean;
  messages: CrmScheduledMessage[];
  onCancel: (scheduledMessageId: string) => Promise<void>;
  onCancelRequest: (scheduledMessageId: string) => void;
  onDismissCancel: () => void;
  onEdit: (message: CrmScheduledMessage) => void;
  onProcessDue?: () => void;
  onSessionFilterChange: (cycleId: string) => void;
  onViewChange: (view: ScheduleView) => void;
  sessionFilter: string;
  successMessage: string | null;
  viewCounts: Record<ScheduleView, number>;
}) {
  return (
    <section
      aria-label="Agenda de mensagens"
      className="crm-schedules-board crm-visits-board"
    >
      {error ? <p className="crm-visits-error">{error}</p> : null}
      {successMessage ? (
        <p className="crm-schedule-success" role="status">
          {successMessage}
        </p>
      ) : null}

      <div className="crm-visits-filters" role="tablist">
        {scheduleViewOrder.map((view) => (
          <button
            aria-selected={activeView === view}
            className={
              activeView === view
                ? "crm-visits-filter crm-visits-filter-active"
                : "crm-visits-filter"
            }
            key={view}
            onClick={() => onViewChange(view)}
            role="tab"
            type="button"
          >
            {scheduleViewLabels[view]}
            <span>{viewCounts[view]}</span>
          </button>
        ))}
      </div>

      <div className="crm-schedule-filter-row">
        <FeatureSelect
          ariaLabel="Filtrar agendamentos por conversa"
          onChange={onSessionFilterChange}
          options={[
            { label: "Todas as conversas", value: "all" },
            ...conversationCycles.map((cycle) => ({
              label: formatCycleName(cycle),
              value: String(cycle.id),
            })),
          ]}
          searchable
          searchPlaceholder="Buscar conversa..."
          value={sessionFilter}
        />
      </div>

      <div className="crm-visits-group">
        <header>
          <span />
          <h3>{scheduleViewLabels[activeView]}</h3>
          {canProcess && viewCounts.pending > 0 && onProcessDue ? (
            <button
              className="crm-visit-action-btn ml-auto"
              disabled={isProcessing}
              onClick={onProcessDue}
              type="button"
            >
              <Zap aria-hidden="true" />
              <span>Processar vencidas</span>
            </button>
          ) : null}
        </header>

        <div className="crm-visits-timeline">
          {!canRead ? (
            <ScheduleEmpty label="Sem permissão para listar agendamentos." />
          ) : isLoading ? (
            <>
              <ScheduleSkeleton />
              <ScheduleSkeleton />
              <ScheduleSkeleton />
            </>
          ) : messages.length ? (
            messages.map((message) => {
              const cycle = conversationCycles.find(
                (c) => String(c.id) === String(message.cycleId),
              );
              return (
                <ScheduleRow
                  canCancel={canCancel}
                  canEdit={canEdit}
                  cancellingId={cancellingId}
                  confirmingCancelId={confirmingCancelId}
                  cycle={cycle}
                  key={message.id}
                  message={message}
                  onCancel={onCancel}
                  onCancelRequest={onCancelRequest}
                  onDismissCancel={onDismissCancel}
                  onEdit={onEdit}
                />
              );
            })
          ) : (
            <ScheduleEmpty label="Nenhum agendamento nesta visao." />
          )}
        </div>
      </div>
    </section>
  );
}

export function ScheduleRow({
  canCancel,
  canEdit,
  cancellingId,
  confirmingCancelId,
  cycle,
  message,
  onCancel,
  onCancelRequest,
  onDismissCancel,
  onEdit,
}: {
  canCancel: boolean;
  canEdit: boolean;
  cancellingId: string | null;
  confirmingCancelId: string | null;
  cycle?: CrmConversationCycle | undefined;
  message: CrmScheduledMessage;
  onCancel: (scheduledMessageId: string) => Promise<void>;
  onCancelRequest?: (scheduledMessageId: string) => void;
  onDismissCancel?: () => void;
  onEdit: (message: CrmScheduledMessage) => void;
}) {
  const isConfirming = confirmingCancelId === message.id;
  const sessionLabel = cycle
    ? formatCycleName(cycle)
    : message.recipientAddress
      ? formatCrmPhone(message.recipientAddress)
      : `Sessão ${String(message.cycleId)}`;
  const leadId = cycle?.leadId ?? null;

  return (
    <article
      className="crm-schedule-row crm-visit-row"
      data-status={message.status}
    >
      <span aria-hidden="true" className="crm-visit-marker" />
      <div className="crm-visit-row-main">
        <div className="crm-visit-row-copy">
          <div className="crm-visit-badges">
            <span className="crm-visit-time-pill">
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

          <strong>{formatDate(message.scheduledAt)}</strong>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="crm-visit-vehicle-chip">
              <MessageSquare aria-hidden="true" />
              <span>{sessionLabel}</span>
            </div>

            {leadId ? (
              <a href={`#/crm?surface=leads&leadId=${leadId}`}>
                <Link2 aria-hidden="true" className="size-3" />
                Lead #{leadId}
              </a>
            ) : null}

            {message.recipientAddress ? (
              <span className="crm-visit-time-pill">
                <Phone aria-hidden="true" />
                {message.recipientAddress}
              </span>
            ) : null}
          </div>

          {message.content ? (
            <p className="crm-visit-notes-box">{message.content}</p>
          ) : null}

          {message.errorMessage ? (
            <p className="crm-visits-error">{message.errorMessage}</p>
          ) : null}
        </div>

        <div className="crm-visit-actions">
          {canEdit && message.status === "pending" && !isConfirming ? (
            <button
              aria-label={`Editar agendamento de ${formatDateTime(message.scheduledAt)}`}
              className="crm-visit-action-btn"
              onClick={() => onEdit(message)}
              title="Editar agendamento"
              type="button"
            >
              <Pencil aria-hidden="true" />
              <span>Editar</span>
            </button>
          ) : null}
          {canCancel && message.status === "pending" ? (
            isConfirming ? (
              <div className="crm-visit-actions">
                <button
                  aria-label="Confirmar cancelamento"
                  className="crm-visit-action-btn"
                  data-action="cancel"
                  disabled={cancellingId === message.id}
                  onClick={() => void onCancel(message.id)}
                  type="button"
                >
                  <Check aria-hidden="true" />
                  <span>Confirmar</span>
                </button>
                <button
                  aria-label="Voltar"
                  className="crm-visit-action-btn"
                  disabled={cancellingId === message.id}
                  onClick={onDismissCancel}
                  type="button"
                >
                  <X aria-hidden="true" />
                  <span>Voltar</span>
                </button>
              </div>
            ) : (
              <button
                aria-label={`Cancelar agendamento de ${formatDateTime(
                  message.scheduledAt,
                )}`}
                className="crm-visit-action-btn"
                data-action="cancel"
                disabled={cancellingId === message.id}
                onClick={() =>
                  onCancelRequest
                    ? onCancelRequest(message.id)
                    : void onCancel(message.id)
                }
                title="Cancelar agendamento"
                type="button"
              >
                <Ban aria-hidden="true" />
                <span>Cancelar</span>
              </button>
            )
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="crm-visit-skeleton">
      <div className="flex justify-between items-center gap-2">
        <div className="crm-skeleton-bar h-5 w-28" />
        <div className="crm-skeleton-bar h-5 w-20 rounded-full" />
      </div>
      <div className="crm-skeleton-bar h-6 w-44" />
      <div className="crm-skeleton-bar h-4 w-32" />
    </div>
  );
}

export function ScheduleEmpty({ label }: { label: string }) {
  return (
    <div className="crm-visit-empty">
      <span aria-hidden="true" className="crm-visit-empty-icon">
        <CalendarCheck />
      </span>
      <strong>{label}</strong>
      <p>Mensagens programadas para disparo automático aparecerão aqui.</p>
    </div>
  );
}

function statusLabel(status: CrmScheduledMessageStatus) {
  const labels: Record<CrmScheduledMessageStatus, string> = {
    cancelled: "Cancelada",
    failed: "Falhou",
    pending: "Pendente",
    sending: "Enviando",
    sent: "Enviada",
  };
  return labels[status] ?? status;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function scheduleMatchesView(message: CrmScheduledMessage, view: ScheduleView) {
  if (view === "all") return true;
  if (view === "cancelled") return message.status === "cancelled";
  if (view === "failed") return message.status === "failed";
  if (view === "sent") return message.status === "sent";
  if (view === "pending")
    return message.status === "pending" || message.status === "sending";
  const scheduled = new Date(message.scheduledAt);
  const now = new Date();
  if (view === "today") return isSameDay(scheduled, now);
  if (view === "tomorrow") return isSameDay(scheduled, startOfTomorrow(now));
  if (view === "upcoming") return scheduled >= startOfAfterTomorrow(now);
  return true;
}

function isSameDay(left: Date, right: Date) {
  return left.toDateString() === right.toDateString();
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfTomorrow(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + 1);
}

function startOfAfterTomorrow(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + 2);
}
