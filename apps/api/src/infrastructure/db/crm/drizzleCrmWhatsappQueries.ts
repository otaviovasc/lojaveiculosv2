import {
  and,
  count,
  eq,
  gt,
  ilike,
  isNotNull,
  isNull,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import { crmWhatsappMessages, crmWhatsappSessions } from "@lojaveiculosv2/db";
import type { UserId } from "@lojaveiculosv2/shared";
import type { CountCrmWhatsappSessionsInput } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function countUnreadMessages(
  db: DrizzleCrmClient,
  session: typeof crmWhatsappSessions.$inferSelect,
) {
  const lastReadAt = session.lastReadAt ?? new Date(0);
  const [row] = await db
    .select({ unreadCount: count() })
    .from(crmWhatsappMessages)
    .where(
      and(
        eq(crmWhatsappMessages.sessionId, session.id),
        eq(crmWhatsappMessages.direction, "INBOUND"),
        gt(crmWhatsappMessages.createdAt, lastReadAt),
      ),
    );
  return Number(row?.unreadCount ?? 0);
}

export async function countSessionsByAssignee(
  db: DrizzleCrmClient,
  filters: SQL[],
) {
  const rows = await db
    .select({
      assigneeId: crmWhatsappSessions.assignedUserId,
      sessionCount: count(),
    })
    .from(crmWhatsappSessions)
    .where(and(...filters, isNotNull(crmWhatsappSessions.assignedUserId)))
    .groupBy(crmWhatsappSessions.assignedUserId);
  return rows.flatMap((row) =>
    row.assigneeId
      ? [
          {
            assigneeId: row.assigneeId as UserId,
            count: Number(row.sessionCount),
          },
        ]
      : [],
  );
}

export function sessionFilters(input: CountCrmWhatsappSessionsInput): SQL[] {
  const filters: SQL[] = [
    eq(crmWhatsappSessions.storeId, input.storeId),
    eq(crmWhatsappSessions.tenantId, input.tenantId),
  ];
  if (input.connectionId) {
    filters.push(eq(crmWhatsappSessions.connectionId, input.connectionId));
  }
  if (input.leadId) filters.push(eq(crmWhatsappSessions.leadId, input.leadId));
  if (input.sessionId)
    filters.push(eq(crmWhatsappSessions.id, input.sessionId));
  if (input.status) filters.push(eq(crmWhatsappSessions.status, input.status));
  if (input.filter === "fresh") {
    filters.push(eq(crmWhatsappSessions.status, "ACTIVE"));
    filters.push(isNull(crmWhatsappSessions.assignedUserId));
    filters.push(isNotNull(crmWhatsappSessions.freshLeadAt));
    filters.push(isNull(crmWhatsappSessions.firstHandledAt));
  }
  if (input.filter === "unassigned") {
    const noLongerFresh = or(
      isNull(crmWhatsappSessions.freshLeadAt),
      isNotNull(crmWhatsappSessions.firstHandledAt),
      ne(crmWhatsappSessions.status, "ACTIVE"),
    );
    filters.push(isNull(crmWhatsappSessions.assignedUserId));
    if (noLongerFresh) filters.push(noLongerFresh);
  }
  if (input.filter === "mine" && input.assignedUserId) {
    filters.push(eq(crmWhatsappSessions.assignedUserId, input.assignedUserId));
  }
  if (input.filter === "others" && input.assignedUserId) {
    filters.push(isNotNull(crmWhatsappSessions.assignedUserId));
    filters.push(ne(crmWhatsappSessions.assignedUserId, input.assignedUserId));
    if (input.selectedAssigneeId) {
      filters.push(
        eq(crmWhatsappSessions.assignedUserId, input.selectedAssigneeId),
      );
    }
  }
  if (input.search) {
    const search = `%${input.search}%`;
    const searchFilter = or(
      ilike(crmWhatsappSessions.buyerName, search),
      ilike(crmWhatsappSessions.buyerPhone, search),
      ilike(crmWhatsappSessions.lastMessageContent, search),
    );
    if (searchFilter) filters.push(searchFilter);
  }
  return filters;
}
