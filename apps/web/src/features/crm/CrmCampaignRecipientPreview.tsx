import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CrmSelect } from "./CrmFormControls";
import type { CrmCampaignRecipient } from "./crmCampaignTypes";
import { formatCycleName } from "./crmConversationModel";
import type { CrmConversationCycle } from "./crmConversationTypes";

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
  conversationCycles,
}: {
  recipients: readonly CrmCampaignRecipient[];
  conversationCycles: CrmConversationCycle[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<RecipientStatusFilter>("all");
  const sessionById = useMemo(
    () => new Map(conversationCycles.map((cycle) => [String(cycle.id), cycle])),
    [conversationCycles],
  );
  const filteredRecipients = useMemo(
    () =>
      recipients.filter((recipient) => {
        const cycle = sessionById.get(recipient.cycleId);
        const name = cycle ? formatCycleName(cycle) : "";
        const haystack = `${name} ${recipient.recipientAddress}`.toLowerCase();
        const matchesQuery =
          !query.trim() || haystack.includes(query.trim().toLowerCase());
        const matchesStatus = recipientMatchesStatus(recipient, statusFilter);
        return matchesQuery && matchesStatus;
      }),
    [query, recipients, sessionById, statusFilter],
  );

  return (
    <div className="crm-campaign-recipient-preview">
      <div className="crm-campaign-recipient-preview-header">
        <div>
          <h4>Destinatarios</h4>
          <span>
            {filteredRecipients.length} de {recipients.length}
          </span>
        </div>
        <div className="crm-campaign-recipient-filters">
          <div className="crm-campaign-recipient-search">
            <Search aria-hidden="true" />
            <input
              aria-label="Buscar destinatario da campanha"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar nome ou telefone"
              value={query}
            />
          </div>
          <CrmSelect
            ariaLabel="Filtrar destinatarios da campanha por status"
            onChange={(value) =>
              setStatusFilter(value as RecipientStatusFilter)
            }
            options={statusFilters}
            value={statusFilter}
          />
        </div>
      </div>
      <div>
        {filteredRecipients.length ? (
          filteredRecipients.map((recipient) => {
            const cycle = sessionById.get(recipient.cycleId);
            return (
              <article key={recipient.id}>
                <div>
                  <strong>
                    {cycle
                      ? formatCycleName(cycle)
                      : recipient.recipientAddress}
                  </strong>
                  <span>{recipient.recipientAddress}</span>
                </div>
                <small>{recipientStatusLabel(recipient.status)}</small>
                {recipient.replyContentPreview ? (
                  <p>{recipient.replyContentPreview}</p>
                ) : null}
              </article>
            );
          })
        ) : (
          <p className="crm-campaign-recipient-empty">
            Nenhum destinatario encontrado para os filtros.
          </p>
        )}
      </div>
    </div>
  );
}

function recipientStatusLabel(status: CrmCampaignRecipient["status"]) {
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
  recipient: CrmCampaignRecipient,
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
