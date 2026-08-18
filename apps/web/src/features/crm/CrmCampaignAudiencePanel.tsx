import { Check, UsersRound } from "lucide-react";
import { CampaignAudienceFilters } from "./CrmCampaignAudienceFilters";
import type {
  CampaignAudienceSource,
  CampaignLeadFilters,
} from "./crmCampaignSources";
import { formatCycleName } from "./crmConversationModel";
import type { CrmConversationCycle, CrmTag } from "./crmConversationTypes";

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
  filteredSessions: CrmConversationCycle[];
  isLoading: boolean;
  leadFilters: CampaignLeadFilters;
  matchedLeadCount: number;
  onAudienceSourceChange: (value: CampaignAudienceSource) => void;
  onLeadFiltersChange: (value: CampaignLeadFilters) => void;
  onQueryChange: (value: string) => void;
  onSelectVisible: () => void;
  onTagChange: (value: string) => void;
  onToggleSession: (cycleId: string) => void;
  query: string;
  selectedTagId: string;
  tags: CrmTag[];
  withoutSessionCount: number;
}) {
  return (
    <section className="crm-campaign-panel">
      <div className="crm-campaign-audience-heading">
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
        <p className="crm-campaign-audience-summary">
          {matchedLeadCount} lead(s) encontrado(s). {withoutSessionCount} sem
          conversa vinculada.
        </p>
      ) : null}
      <div className="crm-campaign-cycle-list">
        {isLoading ? <p>Carregando destinatarios...</p> : null}
        {!isLoading && !filteredSessions.length ? (
          <div className="crm-campaign-audience-empty">
            <UsersRound aria-hidden="true" />
            <span>Nenhum destinatario elegivel para estes filtros.</span>
          </div>
        ) : null}
        {filteredSessions.map((cycle) => {
          const selected = effectiveSelectedIds.has(String(cycle.id));
          return (
            <button
              className={selected ? "crm-campaign-cycle-selected" : ""}
              key={String(cycle.id)}
              onClick={() => onToggleSession(String(cycle.id))}
              type="button"
            >
              <span>{formatCycleName(cycle)}</span>
              <small>{cycle.customerPhone ?? "sem telefone"}</small>
              {selected ? <Check aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
