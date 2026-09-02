import type { z } from "zod";
import type {
  conversationCycleCountsQuerySchema,
  conversationCyclesQuerySchema,
} from "./crm.controller.schemas.js";

type CrmConversationCyclesQuery = z.infer<typeof conversationCyclesQuerySchema>;
type ConversationCycleCountsQuery = z.infer<
  typeof conversationCycleCountsQuerySchema
>;

export function cleanCrmConversationCyclesQuery(
  input: CrmConversationCyclesQuery,
) {
  return {
    ...(input.archived !== undefined ? { archived: input.archived } : {}),
    ...(input.assigneeId ? { assigneeId: input.assigneeId } : {}),
    ...(input.connectionId ? { connectionId: input.connectionId } : {}),
    filter: input.filter,
    ...(input.humanAttendanceState
      ? { humanAttendanceState: input.humanAttendanceState }
      : {}),
    ...(input.leadId ? { leadId: input.leadId } : {}),
    limit: input.limit,
    offset: input.offset,
    ...(input.search ? { search: input.search } : {}),
    ...(input.cycleId ? { cycleId: input.cycleId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.tagIds?.length ? { tagIds: input.tagIds } : {}),
    ...(input.unreadOnly !== undefined ? { unreadOnly: input.unreadOnly } : {}),
  };
}

export function cleanConversationCycleCountsQuery(
  input: ConversationCycleCountsQuery,
) {
  return {
    ...(input.archived !== undefined ? { archived: input.archived } : {}),
    ...(input.connectionId ? { connectionId: input.connectionId } : {}),
    filter: input.filter,
    ...(input.humanAttendanceState
      ? { humanAttendanceState: input.humanAttendanceState }
      : {}),
    ...(input.leadId ? { leadId: input.leadId } : {}),
    ...(input.search ? { search: input.search } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.tagIds?.length ? { tagIds: input.tagIds } : {}),
    ...(input.unreadOnly !== undefined ? { unreadOnly: input.unreadOnly } : {}),
  };
}
