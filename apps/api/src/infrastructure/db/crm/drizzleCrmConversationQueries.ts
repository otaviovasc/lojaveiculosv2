import {
  crmMessages,
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
import type { CountCrmConversationCyclesInput } from "../../../domains/crm/ports/crmConversationRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import type { CanonicalConversationCycleRow } from "./drizzleCrmConversationMappers.js";
import { toCanonicalAttendance } from "./drizzleCrmConversationCyclePreview.js";

export function crmUnreadConversationCyclePredicate(): SQL {
  return sql`exists (
    select 1 from ${crmMessages}
    where ${crmMessages.cycleId} = ${conversationCycles.id}
      and ${crmMessages.direction} = 'inbound'
      and ${crmMessages.createdAt} > coalesce(
        ${conversationCycles.lastReadAt},
        timestamp with time zone '1970-01-01 00:00:00+00'
      )
  )`;
}

export async function countUnreadMessages(
  db: DrizzleCrmClient,
  conversationCycle: CanonicalConversationCycleRow,
) {
  const [row] = await db
    .select({ unreadCount: count() })
    .from(crmMessages)
    .where(
      and(
        eq(crmMessages.cycleId, conversationCycle.cycle.id),
        eq(crmMessages.storeId, conversationCycle.cycle.storeId),
        eq(crmMessages.tenantId, conversationCycle.cycle.tenantId),
        eq(crmMessages.direction, "inbound"),
        gt(
          crmMessages.createdAt,
          conversationCycle.cycle.lastReadAt ?? new Date(0),
        ),
      ),
    );
  return Number(row?.unreadCount ?? 0);
}

export async function countConversationCyclesByAssignee(
  db: DrizzleCrmClient,
  filters: SQL[],
) {
  const rows = await db
    .select({
      assigneeId: conversationCycles.assignedUserId,
      cycleCount: count(),
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
            count: Number(row.cycleCount),
          },
        ]
      : [],
  );
}

export async function countCanonicalConversationCycles(
  db: DrizzleCrmClient,
  input: CountCrmConversationCyclesInput,
  tagThreadIds: readonly string[] | null,
) {
  const filters = conversationCycleFilters(input);
  if (tagThreadIds) filters.push(inArray(conversationThreads.id, tagThreadIds));
  if (input.unreadOnly) filters.push(crmUnreadConversationCyclePredicate());
  const [row] = await db
    .select({ cycleCount: count() })
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
  return Number(row?.cycleCount ?? 0);
}

export function conversationCycleFilters(
  input: CountCrmConversationCyclesInput,
): SQL[] {
  const filters: SQL[] = [
    eq(conversationCycles.storeId, input.storeId),
    eq(conversationCycles.tenantId, input.tenantId),
  ];
  if (!input.includeDeleted) {
    filters.push(isNull(conversationCycles.deletedAt));
  }
  if (input.archived) {
    filters.push(isNotNull(conversationCycles.archivedAt));
  } else if (!input.includeArchived) {
    filters.push(isNull(conversationCycles.archivedAt));
  }
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
  if (input.queueVisibility?.connectionIds != null) {
    if (input.queueVisibility.connectionIds.length === 0) {
      filters.push(sql`false`);
    } else {
      filters.push(
        inArray(conversationThreads.providerConnectionId, [
          ...input.queueVisibility.connectionIds,
        ]),
      );
    }
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
  if (input.cycleId) filters.push(eq(conversationCycles.id, input.cycleId));
  if (input.status)
    filters.push(conversationCycleStatusPredicate(input.status));
  if (input.filter === "fresh") {
    filters.push(conversationCycleStatusPredicate("ACTIVE"));
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

export function canonicalConversationCycleSelection() {
  return {
    attendance: conversationAttendances,
    cycle: conversationCycles,
    thread: conversationThreads,
  };
}

function conversationCycleStatusPredicate(
  status: NonNullable<CountCrmConversationCyclesInput["status"]>,
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
