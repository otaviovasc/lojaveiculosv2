import {
  canonicalMessages,
  conversationAttendances,
  conversationCycles,
  conversationThreads,
} from "@lojaveiculosv2/db";
import type { UserId } from "@lojaveiculosv2/shared";
import {
  and,
  count,
  eq,
  gt,
  ilike,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { CountCrmWhatsappSessionsInput } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import type { CanonicalWhatsappSessionRow } from "./drizzleCrmWhatsappMappers.js";
import { toCanonicalAttendance } from "./drizzleCrmWhatsappSessionPreview.js";

export function crmWhatsappUnreadSessionPredicate(): SQL {
  return sql`exists (
    select 1 from ${canonicalMessages}
    where ${canonicalMessages.cycleId} = ${conversationCycles.id}
      and ${canonicalMessages.direction} = 'inbound'
      and ${canonicalMessages.createdAt} > coalesce(
        ${conversationCycles.lastReadAt},
        timestamp with time zone '1970-01-01 00:00:00+00'
      )
  )`;
}

export async function countUnreadMessages(
  db: DrizzleCrmClient,
  session: CanonicalWhatsappSessionRow,
) {
  const [row] = await db
    .select({ unreadCount: count() })
    .from(canonicalMessages)
    .where(
      and(
        eq(canonicalMessages.cycleId, session.cycle.id),
        eq(canonicalMessages.storeId, session.cycle.storeId),
        eq(canonicalMessages.tenantId, session.cycle.tenantId),
        eq(canonicalMessages.direction, "inbound"),
        gt(
          canonicalMessages.createdAt,
          session.cycle.lastReadAt ?? new Date(0),
        ),
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
      assigneeId: conversationCycles.assignedUserId,
      sessionCount: count(),
    })
    .from(conversationCycles)
    .innerJoin(
      conversationThreads,
      eq(conversationCycles.threadId, conversationThreads.id),
    )
    .innerJoin(
      conversationAttendances,
      eq(conversationAttendances.cycleId, conversationCycles.id),
    )
    .where(and(...filters, isNotNull(conversationCycles.assignedUserId)))
    .groupBy(conversationCycles.assignedUserId);
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

export async function countCanonicalSessions(
  db: DrizzleCrmClient,
  input: CountCrmWhatsappSessionsInput,
  tagThreadIds: readonly string[] | null,
) {
  const filters = sessionFilters(input);
  if (tagThreadIds) filters.push(inArray(conversationThreads.id, tagThreadIds));
  if (input.unreadOnly) filters.push(crmWhatsappUnreadSessionPredicate());
  const [row] = await db
    .select({ sessionCount: count() })
    .from(conversationCycles)
    .innerJoin(
      conversationThreads,
      eq(conversationCycles.threadId, conversationThreads.id),
    )
    .innerJoin(
      conversationAttendances,
      eq(conversationAttendances.cycleId, conversationCycles.id),
    )
    .where(and(...filters));
  return Number(row?.sessionCount ?? 0);
}

export function sessionFilters(input: CountCrmWhatsappSessionsInput): SQL[] {
  const filters: SQL[] = [
    eq(conversationCycles.storeId, input.storeId),
    eq(conversationCycles.tenantId, input.tenantId),
  ];
  switch (input.queueVisibility?.kind) {
    case undefined:
    case "global":
      break;
    case "assigned":
      filters.push(
        eq(conversationCycles.assignedUserId, input.queueVisibility.userId),
      );
      break;
    case "none":
      filters.push(sql`false`);
      break;
  }
  if (input.connectionId)
    filters.push(
      eq(conversationThreads.providerConnectionId, input.connectionId),
    );
  if (input.leadId)
    filters.push(
      sql`${conversationCycles.metadata}->>'leadId' = ${input.leadId}`,
    );
  if (input.humanAttendanceState)
    filters.push(
      eq(
        conversationAttendances.state,
        toCanonicalAttendance(input.humanAttendanceState),
      ),
    );
  if (input.sessionId) filters.push(eq(conversationCycles.id, input.sessionId));
  if (input.status) filters.push(sessionStatusPredicate(input.status));
  if (input.filter === "fresh") {
    filters.push(sessionStatusPredicate("ACTIVE"));
    filters.push(isNull(conversationCycles.assignedUserId));
    filters.push(isNotNull(conversationCycles.freshLeadAt));
    filters.push(isNull(conversationCycles.firstHandledAt));
  }
  if (input.filter === "unassigned") {
    const noLongerFresh = or(
      isNull(conversationCycles.freshLeadAt),
      isNotNull(conversationCycles.firstHandledAt),
      ne(conversationCycles.state, "active"),
      ne(conversationAttendances.state, "bot_active"),
      sql`coalesce(${conversationCycles.metadata}->>'sessionStatus', 'ACTIVE') <> 'ACTIVE'`,
    );
    filters.push(isNull(conversationCycles.assignedUserId));
    if (noLongerFresh) filters.push(noLongerFresh);
  }
  if (input.filter === "mine" && input.assignedUserId)
    filters.push(eq(conversationCycles.assignedUserId, input.assignedUserId));
  if (input.filter === "others" && input.assignedUserId) {
    filters.push(isNotNull(conversationCycles.assignedUserId));
    filters.push(ne(conversationCycles.assignedUserId, input.assignedUserId));
    if (input.selectedAssigneeId)
      filters.push(
        eq(conversationCycles.assignedUserId, input.selectedAssigneeId),
      );
  }
  if (input.search) {
    const search = `%${input.search}%`;
    const searchFilter = or(
      ilike(conversationThreads.customerDisplayName, search),
      ilike(conversationThreads.customerPhone, search),
      ilike(conversationCycles.lastMessageContent, search),
    );
    if (searchFilter) filters.push(searchFilter);
  }
  return filters;
}

export function canonicalSessionSelection() {
  return {
    attendance: conversationAttendances,
    cycle: conversationCycles,
    thread: conversationThreads,
  };
}

function sessionStatusPredicate(
  status: NonNullable<CountCrmWhatsappSessionsInput["status"]>,
): SQL {
  switch (status) {
    case "COMPLETED":
      return eq(conversationCycles.state, "completed");
    case "EXPIRED":
      return eq(conversationCycles.state, "expired");
    case "HUMAN_TAKEOVER":
      return and(
        eq(conversationCycles.state, "active"),
        ne(conversationAttendances.state, "bot_active"),
      )!;
    case "MINIBOT_ACTIVE":
      return and(
        eq(conversationCycles.state, "active"),
        eq(conversationAttendances.state, "bot_active"),
        sql`${conversationCycles.metadata}->>'sessionStatus' = 'MINIBOT_ACTIVE'`,
      )!;
    case "ACTIVE":
      return and(
        eq(conversationCycles.state, "active"),
        eq(conversationAttendances.state, "bot_active"),
        sql`coalesce(${conversationCycles.metadata}->>'sessionStatus', 'ACTIVE') = 'ACTIVE'`,
      )!;
  }
}
