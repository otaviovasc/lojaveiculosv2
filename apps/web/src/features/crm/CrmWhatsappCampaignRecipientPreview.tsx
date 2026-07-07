import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { CrmWhatsappCampaignRecipient } from "./crmWhatsappCampaignTypes";
import { formatSessionName } from "./crmWhatsappModel";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";

type RecipientStatusFilter =
  "all" | "cancelled" | "failed" | "follow_up" | "pending" | "replied" | "sent";

const statusFilters: Array<{ label: string; value: RecipientStatusFilter }> = [
  { label: "Todos", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Enviados", value: "sent" },
  { label: "Falhas", value: "failed" },
  { label: "Responderam", value: "replied" },
  { label: "Follow-up", value: "follow_up" },
  { label: "Cancelados", value: "cancelled" },
];

export function CampaignRecipientPreview({
  recipients,
  sessions,
}: {
  recipients: readonly CrmWhatsappCampaignRecipient[];
  sessions: CrmWhatsappSession[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<RecipientStatusFilter>("all");
  const sessionById = useMemo(
    () => new Map(sessions.map((session) => [String(session.id), session])),
    [sessions],
  );
  const filteredRecipients = useMemo(
    () =>
      recipients.filter((recipient) => {
        const session = sessionById.get(recipient.sessionId);
        const name = session ? formatSessionName(session) : "";
        const haystack = `${name} ${recipient.phone}`.toLowerCase();
        const matchesQuery =
          !query.trim() || haystack.includes(query.trim().toLowerCase());
        const matchesStatus = recipientMatchesStatus(recipient, statusFilter);
        return matchesQuery && matchesStatus;
      }),
    [query, recipients, sessionById, statusFilter],
  );

  return (
    <div className="crm-whatsapp-campaign-recipient-preview">
      <div className="crm-whatsapp-campaign-recipient-preview-header">
        <div>
          <h4>Destinatarios</h4>
          <span>
            {filteredRecipients.length} de {recipients.length}
          </span>
        </div>
        <div className="crm-whatsapp-campaign-recipient-filters">
          <div className="crm-whatsapp-campaign-recipient-search">
            <Search aria-hidden="true" />
            <input
              aria-label="Buscar destinatario da campanha"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar nome ou telefone"
              value={query}
            />
          </div>
          <select
            aria-label="Filtrar destinatarios da campanha por status"
            onChange={(event) =>
              setStatusFilter(event.target.value as RecipientStatusFilter)
            }
            value={statusFilter}
          >
            {statusFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        {filteredRecipients.length ? (
          filteredRecipients.map((recipient) => {
            const session = sessionById.get(recipient.sessionId);
            return (
              <article key={recipient.id}>
                <div>
                  <strong>
                    {session ? formatSessionName(session) : recipient.phone}
                  </strong>
                  <span>{recipient.phone}</span>
                </div>
                <small>{recipientStatusLabel(recipient.status)}</small>
                {recipient.replyContentPreview ? (
                  <p>{recipient.replyContentPreview}</p>
                ) : null}
              </article>
            );
          })
        ) : (
          <p className="crm-whatsapp-campaign-recipient-empty">
            Nenhum destinatario encontrado para os filtros.
          </p>
        )}
      </div>
    </div>
  );
}

function recipientStatusLabel(status: CrmWhatsappCampaignRecipient["status"]) {
  return {
    cancelled: "Cancelado",
    failed: "Falhou",
    pending: "Pendente",
    replied: "Respondeu",
    secondary_scheduled: "Follow-up agendado",
    secondary_sent: "Follow-up enviado",
    sent: "Enviado",
  }[status];
}

function recipientMatchesStatus(
  recipient: CrmWhatsappCampaignRecipient,
  statusFilter: RecipientStatusFilter,
) {
  if (statusFilter === "all") return true;
  if (statusFilter === "follow_up") {
    return (
      recipient.status === "secondary_scheduled" ||
      recipient.status === "secondary_sent"
    );
  }
  return recipient.status === statusFilter;
}
