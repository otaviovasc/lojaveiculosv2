import type { CrmConversationCycleDto } from "@lojaveiculosv2/shared";
import type { CrmChannelConnection } from "../../../domains/crm/channelConnections/channelConnectionModels.js";
import type { CrmConversationCycle } from "../../../domains/crm/ports/crmConversationRepositoryModels.js";
import type { ConversationCycleCommandResponse } from "../../../domains/crm/services/CrmMessagingService/executeCrmConversationCycleCommand.js";
import type { StartConversationResult } from "../../../domains/crm/services/CrmMessagingService/startConversation.js";
import { toChannelConnectionDto } from "./crm.channelConnection.dto.js";
import { toCrmChannelDto } from "./crm.channel.dto.js";
import { toCrmMessageDto } from "./crm.message.dto.js";
import type { CrmServices } from "./crmServices.js";

function toIsoString(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

export function toConversationCycleDto(
  cycle: CrmConversationCycle,
  connection?: CrmChannelConnection,
): CrmConversationCycleDto {
  return {
    assignedUserId: cycle.assignedUserId,
    channel: toCrmChannelDto(cycle.channel),
    connection: connection ? toChannelConnectionDto(connection) : null,
    customerDisplayName: cycle.customerDisplayName,
    customerPhone: cycle.customerPhone,
    humanAttendanceChangedAt: toIsoString(cycle.humanAttendanceChangedAt),
    humanAttendanceState: cycle.humanAttendanceState,
    humanAttendanceStateVersion: cycle.humanAttendanceStateVersion,
    humanHandlingStartedAt: toIsoString(cycle.humanHandlingStartedAt),
    id: cycle.id,
    interventionHistoryStartedAt: toIsoString(cycle.humanTakeoverAt),
    interventionId: cycle.interventionId,
    lastCustomerReadAt: toIsoString(cycle.lastCustomerReadAt),
    lastMessageAt: toIsoString(cycle.lastMessageAt),
    lastMessageContent: cycle.lastMessageContent,
    lastReadAt: toIsoString(cycle.lastReadAt),
    leadId: cycle.leadId,
    metadata: cycle.metadata,
    profilePhotoUrl: cycle.profilePhotoUrl,
    revision: cycle.revision,
    status: cycle.status,
    tags: cycle.tags.map((tag) => ({
      color: tag.color,
      emoji: tag.emoji,
      id: tag.id,
      name: tag.name,
      sortOrder: tag.sortOrder,
    })),
    unreadCount: cycle.unreadCount,
  };
}

export async function listCycleDtos(
  context: Parameters<CrmServices["listConversationCycles"]>[0],
  query: Parameters<CrmServices["listConversationCycles"]>[1],
  services: Pick<
    CrmServices,
    "listConversationCycles" | "listCrmChannelConnections"
  >,
) {
  const [cycles, connections] = await Promise.all([
    services.listConversationCycles(context, query),
    services.listCrmChannelConnections(context),
  ]);
  const connectionsById = new Map(
    connections.map((connection) => [connection.id, connection]),
  );
  return cycles.map((cycle) =>
    toConversationCycleDto(cycle, connectionsById.get(cycle.connectionId)),
  );
}

export function toConversationCycleCommandDto(
  command: ConversationCycleCommandResponse,
) {
  return {
    cycle: toConversationCycleDto(command.conversationCycle),
    result: command.result,
  };
}

export function toStartCycleDto(result: StartConversationResult) {
  return {
    cycle: toConversationCycleDto(result.conversationCycle),
    lead: result.lead,
    message: toCrmMessageDto(result.message),
  };
}
