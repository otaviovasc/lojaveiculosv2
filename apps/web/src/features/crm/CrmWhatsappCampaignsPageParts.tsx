import { Check, Megaphone, Search, Upload } from "lucide-react";
import { formatSessionName } from "./crmWhatsappModel";
import type { CrmWhatsappCampaign } from "./crmWhatsappCampaignTypes";
import type { CrmWhatsappSession, CrmWhatsappTag } from "./crmWhatsappTypes";
import { readMinDateTimeLocal } from "./CrmWhatsappCampaignsPageUtils";

export function CampaignHeader() {
  return (
    <header className="crm-whatsapp-campaigns-header">
      <span>
        <Megaphone aria-hidden="true" />
      </span>
      <div>
        <strong>Campanhas</strong>
        <h2>Disparos agendados por conversa</h2>
        <p>Crie campanhas a partir de conversas existentes.</p>
      </div>
    </header>
  );
}

export function CampaignStats({
  campaigns,
}: {
  campaigns: CrmWhatsappCampaign[];
}) {
  return (
    <div className="crm-whatsapp-campaign-stats">
      {summarizeCampaigns(campaigns).map((item) => (
        <div key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function CampaignMessagePanel({
  canCreate,
  campaignName,
  intervalMinutes,
  isSaving,
  onCampaignNameChange,
  onIntervalMinutesChange,
  onStartAtChange,
  onTextChange,
  startAt,
  text,
}: {
  canCreate: boolean;
  campaignName: string;
  intervalMinutes: number;
  isSaving: boolean;
  onCampaignNameChange: (value: string) => void;
  onIntervalMinutesChange: (value: number) => void;
  onStartAtChange: (value: string) => void;
  onTextChange: (value: string) => void;
  startAt: string;
  text: string;
}) {
  return (
    <section className="crm-whatsapp-campaign-panel">
      <h3>Mensagem e ritmo</h3>
      <label>
        Nome da campanha
        <input
          disabled={!canCreate || isSaving}
          maxLength={191}
          onChange={(event) => onCampaignNameChange(event.target.value)}
          value={campaignName}
        />
      </label>
      <label>
        Mensagem inicial
        <textarea
          disabled={!canCreate || isSaving}
          maxLength={4000}
          onChange={(event) => onTextChange(event.target.value)}
          rows={7}
          value={text}
        />
      </label>
      <div className="crm-whatsapp-campaign-fields">
        <label>
          Inicio
          <input
            disabled={!canCreate || isSaving}
            min={readMinDateTimeLocal()}
            onChange={(event) => onStartAtChange(event.target.value)}
            type="datetime-local"
            value={startAt}
          />
        </label>
        <label>
          Intervalo min.
          <input
            disabled={!canCreate || isSaving}
            min={1}
            onChange={(event) =>
              onIntervalMinutesChange(Math.max(1, Number(event.target.value)))
            }
            type="number"
            value={intervalMinutes}
          />
        </label>
      </div>
      <p>
        Variavel disponivel: <code>{"{nome}"}</code>.
      </p>
    </section>
  );
}

export function CampaignRecipientsPanel({
  effectiveSelectedIds,
  filteredSessions,
  onQueryChange,
  onTagChange,
  onToggleSession,
  query,
  selectedTagId,
  tags,
}: {
  effectiveSelectedIds: Set<string>;
  filteredSessions: CrmWhatsappSession[];
  onQueryChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onToggleSession: (sessionId: string) => void;
  query: string;
  selectedTagId: string;
  tags: CrmWhatsappTag[];
}) {
  return (
    <section className="crm-whatsapp-campaign-panel">
      <h3>Destinatarios</h3>
      <div className="crm-whatsapp-campaign-search">
        <Search aria-hidden="true" />
        <input
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar conversa ou telefone"
          value={query}
        />
      </div>
      <select
        aria-label="Filtrar por tag"
        onChange={(event) => onTagChange(event.target.value)}
        value={selectedTagId}
      >
        <option value="all">Todas as tags</option>
        {tags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </select>
      <div className="crm-whatsapp-campaign-session-list">
        {filteredSessions.map((session) => {
          const selected = effectiveSelectedIds.has(String(session.id));
          return (
            <button
              className={
                selected ? "crm-whatsapp-campaign-session-selected" : ""
              }
              key={String(session.id)}
              onClick={() => onToggleSession(String(session.id))}
              type="button"
            >
              <span>{formatSessionName(session)}</span>
              <small>{session.buyerPhone ?? "sem telefone"}</small>
              {selected ? <Check aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function CampaignCsvPanel({
  csvInput,
  matchedCount,
  onCsvInputChange,
}: {
  csvInput: string;
  matchedCount: number;
  onCsvInputChange: (value: string) => void;
}) {
  return (
    <section className="crm-whatsapp-campaign-panel">
      <h3>
        <Upload aria-hidden="true" />
        CSV / lista
      </h3>
      <textarea
        onChange={(event) => onCsvInputChange(event.target.value)}
        placeholder={"telefone,nome\n5511999999999,Ana"}
        rows={7}
        value={csvInput}
      />
      <p>
        Telefones sao usados para localizar conversas existentes. Linhas sem
        conversa correspondente aparecem bloqueadas na revisao.
      </p>
      <strong>{matchedCount} conversa(s) encontradas</strong>
    </section>
  );
}

function summarizeCampaigns(campaigns: CrmWhatsappCampaign[]) {
  const totals = campaigns.reduce(
    (acc, campaign) => ({
      failed: acc.failed + campaign.failedCount,
      recipients: acc.recipients + campaign.totalRecipients,
      replied: acc.replied + campaign.repliedCount,
      scheduled: acc.scheduled + campaign.scheduledCount,
      sent: acc.sent + campaign.sentCount,
    }),
    { failed: 0, recipients: 0, replied: 0, scheduled: 0, sent: 0 },
  );
  const replyRate =
    totals.sent > 0
      ? `${Math.round((totals.replied / totals.sent) * 100)}%`
      : "0%";
  return [
    { label: "Campanhas", value: campaigns.length },
    { label: "Destinatarios", value: totals.recipients },
    { label: "Agendadas", value: totals.scheduled },
    { label: "Enviadas", value: totals.sent },
    { label: "Falhas", value: totals.failed },
    { label: "Resposta", value: replyRate },
  ];
}
