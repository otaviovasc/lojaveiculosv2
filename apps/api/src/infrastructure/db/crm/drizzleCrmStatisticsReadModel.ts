import type {
  CrmStatisticsBreakdownItem,
  CrmStatisticsReadModel,
} from "../../../domains/crm/readModels/crmStatisticsReadModel.js";
import { queryCrmStatisticsAgents } from "./drizzleCrmStatisticsAgents.js";
import { queryCrmStatisticsCore } from "./drizzleCrmStatisticsCore.js";
import {
  queryCrmStatisticsBreakdowns,
  queryCrmStatisticsConnection,
  queryCrmStatisticsDaily,
} from "./drizzleCrmStatisticsDimensions.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

const channelLabels: Record<string, string> = {
  instagram: "Instagram",
  olx_chat: "OLX Chat",
  whatsapp: "WhatsApp",
};
const sourceLabels: Record<string, string> = {
  manual: "Manual",
  meta_ad: "Anúncio Meta",
  olx: "OLX",
  public_site: "Site público",
  site: "Site",
  unknown: "Não informada",
  whatsapp: "WhatsApp",
};

function number(value: string | number | null | undefined) {
  return value == null ? 0 : Number(value);
}

function aggregateBreakdown(
  rows: Awaited<ReturnType<typeof queryCrmStatisticsBreakdowns>>,
  field: "channel" | "source",
  labels: Record<string, string>,
): CrmStatisticsBreakdownItem[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = row[field];
    totals.set(key, (totals.get(key) ?? 0) + number(row.conversation_count));
  }
  return [...totals.entries()]
    .map(([key, count]) => ({ count, key, label: labels[key] ?? key }))
    .sort((left, right) => right.count - left.count);
}

export function createDrizzleCrmStatisticsReadModel(
  db: DrizzleCrmClient,
): CrmStatisticsReadModel {
  return {
    async load(input) {
      const [core, breakdowns, connection, daily, agents] = await Promise.all([
        queryCrmStatisticsCore(db, input),
        queryCrmStatisticsBreakdowns(db, input),
        queryCrmStatisticsConnection(db, input),
        queryCrmStatisticsDaily(db, input),
        queryCrmStatisticsAgents(db, input),
      ]);
      const inbound = number(core.inbound);
      const humanOutbound = number(core.human_outbound);
      const externalAiOutbound = number(core.external_ai_outbound);
      const internalAutomationOutbound = number(
        core.internal_automation_outbound,
      );
      const otherOutbound = number(core.other_outbound);
      return {
        agents: agents.map((agent) => ({
          active: agent.active,
          agentId: agent.agent_id,
          averageFirstResponseMs:
            agent.average_first_response_ms == null
              ? null
              : number(agent.average_first_response_ms),
          email: agent.email,
          handledConversations: number(agent.handled_conversations),
          humanOutboundMessages: number(agent.human_outbound_messages),
          name: agent.name ?? agent.email,
          openAssignments: number(agent.open_assignments),
          role: agent.role,
        })),
        attribution: "current_assignee" as const,
        byChannel: aggregateBreakdown(breakdowns, "channel", channelLabels),
        bySource: aggregateBreakdown(breakdowns, "source", sourceLabels),
        connection: connection
          ? {
              channel: connection.channel,
              id: connection.id,
              name: connection.display_name,
              provider: connection.provider,
              status: connection.state,
            }
          : null,
        daily: daily.map((item) => ({
          conversationsCreated: number(item.conversations_created),
          date: item.day,
          externalAiOutboundMessages: number(item.external_ai_outbound),
          humanOutboundMessages: number(item.human_outbound),
          inboundMessages: number(item.inbound),
          internalAutomationOutboundMessages: number(
            item.internal_automation_outbound,
          ),
          otherOutboundMessages: number(item.other_outbound),
        })),
        messages: {
          externalAiOutbound,
          humanOutbound,
          inbound,
          internalAutomationOutbound,
          otherOutbound,
          total:
            inbound +
            humanOutbound +
            externalAiOutbound +
            internalAutomationOutbound +
            otherOutbound,
        },
        queues: {
          assigned: number(core.assigned),
          completed: number(core.completed),
          fresh: number(core.fresh),
          inHumanService: number(core.in_human_service),
          unassigned: number(core.unassigned),
          waitingHuman: number(core.waiting_human),
        },
        summary: {
          activeConversations: number(core.active_conversations),
          automatedHandledConversations: number(
            core.automated_handled_conversations,
          ),
          averageFirstResponseMs:
            core.average_first_response_ms == null
              ? null
              : number(core.average_first_response_ms),
          completedConversations: number(core.completed_conversations),
          conversationsCreated: number(core.conversations_created),
          firstResponseSamples: number(core.first_response_samples),
          humanHandledConversations: number(core.human_handled_conversations),
          scheduledVisits: number(core.scheduled_visits),
          wonLeads: number(core.won_leads),
        },
      };
    },
  };
}
