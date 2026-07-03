import type { z } from "zod";
import type {
  whatsappSessionCountsQuerySchema,
  whatsappSessionsQuerySchema,
} from "./crm.controller.schemas.js";

type WhatsappSessionsQuery = z.infer<typeof whatsappSessionsQuerySchema>;
type WhatsappSessionCountsQuery = z.infer<
  typeof whatsappSessionCountsQuerySchema
>;

export function cleanWhatsappSessionsQuery(input: WhatsappSessionsQuery) {
  return {
    ...(input.connectionId ? { connectionId: input.connectionId } : {}),
    filter: input.filter,
    limit: input.limit,
    offset: input.offset,
    ...(input.search ? { search: input.search } : {}),
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.tagIds?.length ? { tagIds: input.tagIds } : {}),
    ...(input.unreadOnly !== undefined ? { unreadOnly: input.unreadOnly } : {}),
  };
}

export function cleanWhatsappSessionCountsQuery(
  input: WhatsappSessionCountsQuery,
) {
  return {
    ...(input.connectionId ? { connectionId: input.connectionId } : {}),
    filter: input.filter,
    ...(input.search ? { search: input.search } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.tagIds?.length ? { tagIds: input.tagIds } : {}),
    ...(input.unreadOnly !== undefined ? { unreadOnly: input.unreadOnly } : {}),
  };
}
