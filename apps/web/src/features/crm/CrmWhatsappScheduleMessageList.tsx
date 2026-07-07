import { Ban, Calendar, Clock, MessageSquare, Phone } from "lucide-react";
import { formatSessionName } from "./crmWhatsappModel";
import type {
  CrmWhatsappScheduledMessage,
  CrmWhatsappScheduledMessageStatus,
  CrmWhatsappSession,
} from "./crmWhatsappTypes";

const statusLabels: Record<CrmWhatsappScheduledMessageStatus, string> = {
  cancelled: "Cancelada",
  failed: "Falhou",
  pending: "Pendente",
  sending: "Enviando",
  sent: "Enviada",
};
const statusIcons: Record<CrmWhatsappScheduledMessageStatus, typeof Clock> = {
  cancelled: Ban,
  failed: Ban,
  pending: Clock,
  sending: Clock,
  sent: MessageSquare,
};

export function ScheduleList({
  canCancel,
  cancellingId,
  confirmingCancelId,
  emptyLabel = "Nenhum agendamento.",
  isLoading,
  messages,
  onCancel,
  onCancelRequest,
  onDismissCancel,
  sessions,
}: {
  canCancel: boolean;
  cancellingId: string | null;
  confirmingCancelId?: string | null;
  emptyLabel?: string;
  isLoading: boolean;
  messages: CrmWhatsappScheduledMessage[];
  onCancelRequest?: (scheduledMessageId: string) => void;
  onCancel: (scheduledMessageId: string) => Promise<void>;
  onDismissCancel?: () => void;
  sessions?: CrmWhatsappSession[];
}) {
  if (isLoading) {
    return <p className="crm-whatsapp-schedule-empty">Carregando...</p>;
  }
  if (!messages.length) {
    return <p className="crm-whatsapp-schedule-empty">{emptyLabel}</p>;
  }
  return (
    <div className="crm-whatsapp-schedule-list">
      {messages.map((message) => {
        const session = sessions?.find(
          (session) => String(session.id) === String(message.sessionId),
        );
        return (
          <ScheduleRow
            canCancel={canCancel}
            cancellingId={cancellingId}
            confirmingCancelId={confirmingCancelId ?? null}
            key={message.id}
            message={message}
            onCancel={onCancel}
            {...(onCancelRequest ? { onCancelRequest } : {})}
            {...(onDismissCancel ? { onDismissCancel } : {})}
            {...(session ? { session } : {})}
          />
        );
      })}
    </div>
  );
}

function ScheduleRow({
  canCancel,
  cancellingId,
  confirmingCancelId,
  message,
  onCancel,
  onCancelRequest,
  onDismissCancel,
  session,
}: {
  canCancel: boolean;
  cancellingId: string | null;
  confirmingCancelId: string | null;
  message: CrmWhatsappScheduledMessage;
  onCancel: (scheduledMessageId: string) => Promise<void>;
  onCancelRequest?: (scheduledMessageId: string) => void;
  onDismissCancel?: () => void;
  session?: CrmWhatsappSession;
}) {
  const isConfirming = confirmingCancelId === message.id;
  const sessionLabel = session
    ? formatSessionName(session)
    : `Sessao ${String(message.sessionId)}`;
  const leadLabel = session?.leadId ? `Lead ${session.leadId}` : null;
  const StatusIcon = statusIcons[message.status];
  return (
    <article className="crm-whatsapp-schedule-row">
      <div>
        <div className="crm-whatsapp-schedule-row-heading">
          <span
            className={[
              "crm-whatsapp-schedule-status",
              `crm-whatsapp-schedule-status-${message.status}`,
            ].join(" ")}
          >
            <StatusIcon aria-hidden="true" className="size-3" />
            {statusLabels[message.status]}
          </span>
          <strong>{formatDateTime(message.scheduledAt)}</strong>
        </div>
        <dl className="crm-whatsapp-schedule-meta">
          <div>
            <dt>
              <MessageSquare aria-hidden="true" className="size-3" />
              Sessao
            </dt>
            <dd>{sessionLabel}</dd>
          </div>
          {leadLabel ? (
            <div>
              <dt>Lead</dt>
              <dd>{leadLabel}</dd>
            </div>
          ) : null}
          <div>
            <dt>
              <Phone aria-hidden="true" className="size-3" />
              Telefone
            </dt>
            <dd>{message.phone}</dd>
          </div>
          <div>
            <dt>
              <Calendar aria-hidden="true" className="size-3" />
              Criado
            </dt>
            <dd>{formatDate(message.createdAt)}</dd>
          </div>
        </dl>
        <p>{message.text}</p>
        {message.errorMessage ? (
          <small>Erro: {message.errorMessage}</small>
        ) : null}
      </div>
      {canCancel && message.status === "pending" ? (
        isConfirming ? (
          <div className="crm-whatsapp-schedule-confirm">
            <span>Cancelar este agendamento?</span>
            <button
              className="crm-action crm-action-danger"
              disabled={cancellingId === message.id}
              onClick={() => void onCancel(message.id)}
              type="button"
            >
              Confirmar
            </button>
            <button
              className="crm-action crm-action-muted"
              disabled={cancellingId === message.id}
              onClick={onDismissCancel}
              type="button"
            >
              Voltar
            </button>
          </div>
        ) : (
          <button
            aria-label={`Cancelar agendamento de ${formatDateTime(
              message.scheduledAt,
            )}`}
            className="crm-icon-action"
            disabled={cancellingId === message.id}
            onClick={() =>
              onCancelRequest
                ? onCancelRequest(message.id)
                : void onCancel(message.id)
            }
            title="Cancelar agendamento"
            type="button"
          >
            <Ban />
          </button>
        )
      ) : null}
    </article>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}
