import type { ProductCrmApi } from "./productCrmApi";
import type {
  CrmLeadSource,
  CrmLeadStatus,
  ProductCrmLead,
} from "./productCrmTypes";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";

const pageSize = 100;

export type CampaignAudienceSource = "conversations" | "leads";

export type CampaignLeadFilters = {
  query: string;
  source: CrmLeadSource | "all";
  status: CrmLeadStatus | "all";
};

export type CampaignLeadAudience = {
  matchedLeadCount: number;
  sessions: CrmWhatsappSession[];
  withoutSessionCount: number;
};

export async function listAllCampaignSessions(
  listSessions: CrmWhatsappApi["listSessions"],
) {
  return listAllPages((offset) =>
    listSessions({ filter: "all", limit: pageSize, offset }),
  );
}

export async function listAllCampaignLeads(
  listLeads: ProductCrmApi["listLeads"],
) {
  return listAllPages((offset) => listLeads({ limit: pageSize, offset }));
}

export function resolveCampaignLeadAudience(
  leads: ProductCrmLead[],
  sessions: CrmWhatsappSession[],
  filters: CampaignLeadFilters,
): CampaignLeadAudience {
  const matchedLeads = leads.filter((lead) => matchesLead(lead, filters));
  const sessionsByLeadId = groupSessionsByLeadId(sessions);
  const resolvedSessions: CrmWhatsappSession[] = [];
  let withoutSessionCount = 0;

  for (const lead of matchedLeads) {
    const session = sessionsByLeadId.get(lead.id)?.[0];
    if (session) resolvedSessions.push(session);
    else withoutSessionCount++;
  }

  return {
    matchedLeadCount: matchedLeads.length,
    sessions: resolvedSessions,
    withoutSessionCount,
  };
}

async function listAllPages<T>(load: (offset: number) => Promise<T[]>) {
  const items: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await load(offset);
    items.push(...page);
    if (page.length < pageSize) return items;
  }
}

function groupSessionsByLeadId(sessions: CrmWhatsappSession[]) {
  const result = new Map<string, CrmWhatsappSession[]>();
  for (const session of sessions) {
    if (!session.leadId) continue;
    const current = result.get(session.leadId) ?? [];
    current.push(session);
    current.sort((left, right) => sessionTime(right) - sessionTime(left));
    result.set(session.leadId, current);
  }
  return result;
}

function matchesLead(lead: ProductCrmLead, filters: CampaignLeadFilters) {
  if (filters.source !== "all" && lead.source !== filters.source) return false;
  if (filters.status !== "all" && lead.status !== filters.status) return false;
  const query = filters.query.trim().toLocaleLowerCase("pt-BR");
  if (!query) return true;
  return [
    lead.buyerName,
    lead.buyerPhone,
    lead.buyerEmail,
    lead.vehicleTitle,
  ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(query));
}

function sessionTime(session: CrmWhatsappSession) {
  const value = session.lastMessageAt;
  return value ? new Date(value).getTime() || 0 : 0;
}
