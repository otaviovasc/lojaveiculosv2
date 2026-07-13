import { useEffect, useMemo, useState } from "react";
import type { ProductCrmApi } from "./productCrmApi";
import type { ProductCrmLead } from "./productCrmTypes";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import {
  listAllCampaignLeads,
  listAllCampaignSessions,
  resolveCampaignLeadAudience,
  type CampaignAudienceSource,
  type CampaignLeadFilters,
} from "./crmWhatsappCampaignSources";
import { matchesCampaignFilters } from "./CrmWhatsappCampaignsPageSupport";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";

const initialLeadFilters: CampaignLeadFilters = {
  query: "",
  source: "all",
  status: "all",
};

export function useCrmWhatsappCampaignAudience(input: {
  canRead: boolean;
  initialSessions: CrmWhatsappSession[];
  onListLeads?: ProductCrmApi["listLeads"];
  onListSessions?: CrmWhatsappApi["listSessions"];
}) {
  const [audienceSource, setAudienceSource] =
    useState<CampaignAudienceSource>("conversations");
  const [leadFilters, setLeadFilters] =
    useState<CampaignLeadFilters>(initialLeadFilters);
  const [leads, setLeads] = useState<ProductCrmLead[]>([]);
  const [query, setQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("all");
  const [sessions, setSessions] = useState(input.initialSessions);
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
    () => resolveCampaignLeadAudience(leads, sessions, leadFilters),
    [leadFilters, leads, sessions],
  );
  const conversationSessions = useMemo(
    () =>
      sessions.filter((session) =>
        matchesCampaignFilters(session, query, selectedTagId),
      ),
    [query, selectedTagId, sessions],
  );

  return {
    audienceSource,
    error,
    filteredSessions:
      audienceSource === "leads" ? leadAudience.sessions : conversationSessions,
    isLoading,
    leadFilters,
    matchedLeadCount: leadAudience.matchedLeadCount,
    query,
    selectedTagId,
    sessions,
    setAudienceSource,
    setLeadFilters,
    setQuery,
    setSelectedTagId,
    withoutSessionCount: leadAudience.withoutSessionCount,
  };
}
