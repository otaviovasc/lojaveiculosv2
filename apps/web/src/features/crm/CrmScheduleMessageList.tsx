import {
  Ban,
  Calendar,
  Check,
  Clock,
  Link2,
  MessageSquare,
  Phone,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { formatCycleName } from "./crmConversationModel";
import type {
  CrmConversationCycle,
  CrmScheduledMessage,
  CrmScheduledMessageStatus,
} from "./crmConversationTypes";

export const scheduleStatusLabels: Record<CrmScheduledMessageStatus, string> = {
  cancelled: "Cancelada",
  failed: "Falhou",
  pending: "Pendente",
  sending: "Enviando",
  sent: "Enviada",
};

export const scheduleStatusIcons: Record<
  CrmScheduledMessageStatus,
  typeof Clock
> = {
  cancelled: Ban,
  failed: X,
  pending: Clock,
  sending: RotateCcw,
  sent: Send,
};

export function ScheduleList({
  canCancel,
  cancellingId,
  confirmingCancelId,
  conversationCycles,
  emptyLabel = "Nenhum agendamento encontrado.",
  isLoading,
  messages,
  onCancel,
  onCancelRequest,
  onDismissCancel,
}: {
  canCancel: boolean;
  cancellingId: string | null;
  confirmingCancelId?: string | null;
  conversationCycles?: CrmConversationCycle[];
  emptyLabel?: string;
  isLoading: boolean;
  messages: CrmScheduledMessage[];
  onCancel: (scheduledMessageId: string) => Promise<void>;
  onCancelRequest?: (scheduledMessageId: string) => void;
  onDismissCancel?: () => void;
}) {
  if (isLoading) {
    return (
      <div className="crm-visits-timeline">
        <ScheduleSkeleton />
        <ScheduleSkeleton />
        <ScheduleSkeleton />
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="crm-visit-empty">
        <span aria-hidden="true" className="crm-visit-empty-icon">
          <Calendar />
        </span>
        <strong>{emptyLabel}</strong>
        <p>Mensagens programadas para disparo automático aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="crm-visits-timeline">
      {messages.map((message) => {
        const cycle = conversationCycles?.find(
          (c) => String(c.id) === String(message.cycleId),
        );
        return (
          <ScheduleRow
            canCancel={canCancel}
            cancellingId={cancellingId}
            confirmingCancelId={confirmingCancelId ?? null}
            cycle={cycle}
            key={message.id}
            message={message}
            onCancel={onCancel}
            {...(onCancelRequest ? { onCancelRequest } : {})}
            {...(onDismissCancel ? { onDismissCancel } : {})}
          />
        );
      })}
    </div>
  );
}

export function ScheduleRow({
  canCancel,
  cancellingId,
  confirmingCancelId,
  cycle,
  message,
  onCancel,
  onCancelRequest,
  onDismissCancel,
}: {
  canCancel: boolean;
  cancellingId: string | null;
  confirmingCancelId: string | null;
  cycle?: CrmConversationCycle | undefined;
  message: CrmScheduledMessage;
  onCancel: (scheduledMessageId: string) => Promise<void>;
  onCancelRequest?: (scheduledMessageId: string) => void;
  onDismissCancel?: () => void;
}) {
  const isConfirming = confirmingCancelId === message.id;
  const isCancellingThis = cancellingId === message.id;
  const sessionLabel = cycle
    ? formatCycleName(cycle)
    : `Sessão ${String(message.cycleId)}`;
  const leadId = cycle?.leadId ?? null;
  const StatusIcon = scheduleStatusIcons[message.status] ?? Clock;

  return (
    <article
      className="crm-visit-row crm-schedule-row"
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
              className="crm-visit-status-badge crm-schedule-status-badge"
              data-status={message.status}
            >
              <StatusIcon aria-hidden="true" className="size-3" />
              {scheduleStatusLabels[message.status]}
            </span>
          </div>

          <strong>{formatDate(message.scheduledAt)}</strong>

          <div className="crm-schedule-recipients-row">
            <div className="crm-schedule-session-chip">
              <MessageSquare aria-hidden="true" />
              <span>{sessionLabel}</span>
            </div>

            {leadId ? (
              <a
                className="crm-schedule-lead-link"
                href={`#/crm?surface=leads&leadId=${leadId}`}
              >
                <Link2 aria-hidden="true" className="size-3" />
                Lead #{leadId}
              </a>
            ) : null}

            {message.recipientAddress ? (
              <span className="crm-schedule-phone-chip">
                <Phone aria-hidden="true" />
                {message.recipientAddress}
              </span>
            ) : null}
          </div>

          <div className="crm-schedule-message-box">
            <p>{message.content}</p>
          </div>

          {message.errorMessage ? (
            <div className="crm-schedule-error-box">
              <small>Erro: {message.errorMessage}</small>
            </div>
          ) : null}
        </div>

        <div className="crm-visit-actions">
          {canCancel && message.status === "pending" ? (
            isConfirming ? (
              <div className="crm-schedule-confirm">
                <span>Cancelar envio?</span>
                <button
                  className="crm-visit-action-btn"
                  data-action="cancel"
                  disabled={isCancellingThis}
                  onClick={() => void onCancel(message.id)}
                  type="button"
                >
                  <Check aria-hidden="true" />
                  <span>Confirmar</span>
                </button>
                <button
                  className="crm-visit-action-btn"
                  disabled={isCancellingThis}
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
                disabled={isCancellingThis}
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

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function ScheduleSkeleton() {
  return (
    <div className="crm-visit-skeleton">
      <div className="flex justify-between items-center gap-2">
        <div className="crm-skeleton-bar h-5 w-28" />
        <div className="crm-skeleton-bar h-5 w-20 rounded-full" />
      </div>
      <div className="crm-skeleton-bar h-6 w-44" />
      <div className="crm-skeleton-bar h-4 w-32" />
      <div className="crm-skeleton-bar h-12 w-full" />
    </div>
  );
}
