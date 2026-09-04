import { useEffect, useMemo, useState } from "react";
import type { ProductCrmApi } from "./productCrmApi";
import type { ProductCrmLead } from "./productCrmTypes";
import type { CrmConversationApi } from "./crmConversationApi";
import {
  listAllCampaignLeads,
  listAllCampaignSessions,
  resolveCampaignLeadAudience,
  type CampaignAudienceSource,
  type CampaignLeadFilters,
} from "./crmCampaignSources";
import { matchesCampaignFilters } from "./CrmCampaignsPageSupport";
import type { CrmConversationCycle } from "./crmConversationTypes";

const initialLeadFilters: CampaignLeadFilters = {
  query: "",
  source: "all",
  status: "all",
};

export function useCrmCampaignAudience(input: {
  canRead: boolean;
  initialSessions: CrmConversationCycle[];
  onListLeads?: ProductCrmApi["listLeads"];
  onListSessions?: CrmConversationApi["listConversationCycles"];
}) {
  const [audienceSource, setAudienceSource] =
    useState<CampaignAudienceSource>("conversations");
  const [leadFilters, setLeadFilters] =
    useState<CampaignLeadFilters>(initialLeadFilters);
  const [leads, setLeads] = useState<ProductCrmLead[]>([]);
  const [query, setQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("all");
  const [conversationCycles, setSessions] = useState(input.initialSessions);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input.onListLeads || !input.onListSessions || !input.canRead) {
      setSessions(input.initialSessions);
      return;
    }
    let active = true;
    setIsLoading(true);
    setError(null);
    void Promise.all([
      listAllCampaignLeads(input.onListLeads),
      listAllCampaignSessions(input.onListSessions),
    ])
      .then(([nextLeads, nextSessions]) => {
        if (!active) return;
        setLeads(nextLeads);
        setSessions(nextSessions);
      })
      .catch(() => {
        if (active) {
          setError("Nao foi possivel carregar todos os destinatarios.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    input.canRead,
    input.initialSessions,
    input.onListLeads,
    input.onListSessions,
  ]);

  const leadAudience = useMemo(
    () => resolveCampaignLeadAudience(leads, conversationCycles, leadFilters),
    [leadFilters, leads, conversationCycles],
  );
  const conversationSessions = useMemo(
    () =>
      conversationCycles.filter((cycle) =>
        matchesCampaignFilters(cycle, query, selectedTagId),
      ),
    [query, selectedTagId, conversationCycles],
  );

  return {
    audienceSource,
    error,
    filteredSessions:
      audienceSource === "leads"
        ? leadAudience.conversationCycles
        : conversationSessions,
    isLoading,
    leadFilters,
    matchedLeadCount: leadAudience.matchedLeadCount,
    query,
    selectedTagId,
    conversationCycles,
    setAudienceSource,
    setLeadFilters,
    setQuery,
    setSelectedTagId,
    withoutSessionCount: leadAudience.withoutSessionCount,
  };
}
