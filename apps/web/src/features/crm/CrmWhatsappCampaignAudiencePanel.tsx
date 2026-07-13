import { Check, UsersRound } from "lucide-react";
import { CampaignAudienceFilters } from "./CrmWhatsappCampaignAudienceFilters";
import type {
  CampaignAudienceSource,
  CampaignLeadFilters,
} from "./crmWhatsappCampaignSources";
import { formatSessionName } from "./crmWhatsappModel";
import type { CrmWhatsappSession, CrmWhatsappTag } from "./crmWhatsappTypes";

export function CampaignAudiencePanel({
  audienceSource,
  effectiveSelectedIds,
  filteredSessions,
  isLoading,
  leadFilters,
  matchedLeadCount,
  onAudienceSourceChange,
  onLeadFiltersChange,
  onQueryChange,
  onSelectVisible,
  onTagChange,
  onToggleSession,
  query,
  selectedTagId,
  tags,
  withoutSessionCount,
}: {
  audienceSource: CampaignAudienceSource;
  effectiveSelectedIds: Set<string>;
  filteredSessions: CrmWhatsappSession[];
  isLoading: boolean;
  leadFilters: CampaignLeadFilters;
  matchedLeadCount: number;
  onAudienceSourceChange: (value: CampaignAudienceSource) => void;
  onLeadFiltersChange: (value: CampaignLeadFilters) => void;
  onQueryChange: (value: string) => void;
  onSelectVisible: () => void;
  onTagChange: (value: string) => void;
  onToggleSession: (sessionId: string) => void;
  query: string;
  selectedTagId: string;
  tags: CrmWhatsappTag[];
  withoutSessionCount: number;
}) {
  return (
    <section className="crm-whatsapp-campaign-panel">
      <div className="crm-whatsapp-campaign-audience-heading">
        <div>
          <h3>Destinatarios</h3>
          <p>{effectiveSelectedIds.size} conversa(s) selecionada(s)</p>
        </div>
        <button
          disabled={!filteredSessions.length}
          onClick={onSelectVisible}
          type="button"
        >
          Selecionar visiveis
        </button>
      </div>
      <CampaignAudienceFilters
        audienceSource={audienceSource}
        leadFilters={leadFilters}
        onAudienceSourceChange={onAudienceSourceChange}
        onLeadFiltersChange={onLeadFiltersChange}
        onQueryChange={onQueryChange}
        onTagChange={onTagChange}
        query={query}
        selectedTagId={selectedTagId}
        tags={tags}
      />
      {audienceSource === "leads" ? (
        <p className="crm-whatsapp-campaign-audience-summary">
          {matchedLeadCount} lead(s) encontrado(s). {withoutSessionCount} sem
          conversa vinculada.
        </p>
      ) : null}
      <div className="crm-whatsapp-campaign-session-list">
        {isLoading ? <p>Carregando destinatarios...</p> : null}
        {!isLoading && !filteredSessions.length ? (
          <div className="crm-whatsapp-campaign-audience-empty">
            <UsersRound aria-hidden="true" />
            <span>Nenhum destinatario elegivel para estes filtros.</span>
          </div>
        ) : null}
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
