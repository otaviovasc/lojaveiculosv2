import { Trash2 } from "lucide-react";
import type {
  CrmWhatsappScheduledMessage,
  CrmWhatsappScheduledMessageStatus,
} from "./crmWhatsappTypes";

const statusLabels: Record<CrmWhatsappScheduledMessageStatus, string> = {
  cancelled: "Cancelada",
  failed: "Falhou",
  pending: "Pendente",
  sending: "Enviando",
  sent: "Enviada",
};

export function ScheduleList({
  canCancel,
  cancellingId,
  isLoading,
  messages,
  onCancel,
}: {
  canCancel: boolean;
  cancellingId: string | null;
  isLoading: boolean;
  messages: CrmWhatsappScheduledMessage[];
  onCancel: (scheduledMessageId: string) => Promise<void>;
}) {
  if (isLoading) {
    return <p className="crm-whatsapp-schedule-empty">Carregando...</p>;
  }
  if (!messages.length) {
    return <p className="crm-whatsapp-schedule-empty">Nenhum agendamento.</p>;
  }
  return (
    <div className="crm-whatsapp-schedule-list">
      {messages.map((message) => (
        <ScheduleRow
          canCancel={canCancel}
          cancellingId={cancellingId}
          key={message.id}
          message={message}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}

function ScheduleRow({
  canCancel,
  cancellingId,
  message,
  onCancel,
}: {
  canCancel: boolean;
  cancellingId: string | null;
  message: CrmWhatsappScheduledMessage;
  onCancel: (scheduledMessageId: string) => Promise<void>;
}) {
  return (
    <article className="crm-whatsapp-schedule-row">
      <div>
        <span
          className={[
            "crm-whatsapp-schedule-status",
            `crm-whatsapp-schedule-status-${message.status}`,
          ].join(" ")}
        >
          {statusLabels[message.status]}
        </span>
        <strong>{formatDateTime(message.scheduledAt)}</strong>
        <p>{message.text}</p>
        {message.errorMessage ? <small>{message.errorMessage}</small> : null}
      </div>
      {canCancel && message.status === "pending" ? (
        <button
          aria-label="Cancelar agendamento"
          className="crm-icon-action"
          disabled={cancellingId === message.id}
          onClick={() => void onCancel(message.id)}
          title="Cancelar agendamento"
          type="button"
        >
          <Trash2 />
        </button>
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
