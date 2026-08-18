import type { ProductCrmApi } from "./productCrmApi";
import type {
  CrmLeadSource,
  CrmLeadStatus,
  ProductCrmLead,
} from "./productCrmTypes";
import type { CrmConversationApi } from "./crmConversationApi";
import type { CrmConversationCycle } from "./crmConversationTypes";

const pageSize = 100;

export type CampaignAudienceSource = "conversations" | "leads";

export type CampaignLeadFilters = {
  query: string;
  source: CrmLeadSource | "all";
  status: CrmLeadStatus | "all";
};

export type CampaignLeadAudience = {
  matchedLeadCount: number;
  conversationCycles: CrmConversationCycle[];
  withoutSessionCount: number;
};

export async function listAllCampaignSessions(
  listConversationCycles: CrmConversationApi["listConversationCycles"],
) {
  return listAllPages((offset) =>
    listConversationCycles({ filter: "all", limit: pageSize, offset }),
  );
}

export async function listAllCampaignLeads(
  listLeads: ProductCrmApi["listLeads"],
) {
  return listAllPages((offset) => listLeads({ limit: pageSize, offset }));
}

export function resolveCampaignLeadAudience(
  leads: ProductCrmLead[],
  conversationCycles: CrmConversationCycle[],
  filters: CampaignLeadFilters,
): CampaignLeadAudience {
  const matchedLeads = leads.filter((lead) => matchesLead(lead, filters));
  const sessionsByLeadId = groupSessionsByLeadId(conversationCycles);
  const resolvedSessions: CrmConversationCycle[] = [];
  let withoutSessionCount = 0;

  for (const lead of matchedLeads) {
    const cycle = sessionsByLeadId.get(lead.id)?.[0];
    if (cycle) resolvedSessions.push(cycle);
    else withoutSessionCount++;
  }

  return {
    matchedLeadCount: matchedLeads.length,
    conversationCycles: resolvedSessions,
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

function groupSessionsByLeadId(conversationCycles: CrmConversationCycle[]) {
  const result = new Map<string, CrmConversationCycle[]>();
  for (const cycle of conversationCycles) {
    if (!cycle.leadId) continue;
    const current = result.get(cycle.leadId) ?? [];
    current.push(cycle);
    current.sort((left, right) => sessionTime(right) - sessionTime(left));
    result.set(cycle.leadId, current);
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

function sessionTime(cycle: CrmConversationCycle) {
  const value = cycle.lastMessageAt;
  return value ? new Date(value).getTime() || 0 : 0;
}
