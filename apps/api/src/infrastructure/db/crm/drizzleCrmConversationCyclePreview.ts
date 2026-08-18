import {
  conversationAttendances,
  conversationCycles,
  conversationThreads,
} from "@lojaveiculosv2/db";
import { and, eq, sql } from "drizzle-orm";
import type {
  CrmHumanAttendanceState,
  IngestCrmMessageInput,
  UpdateCrmConversationCycleInput,
  UpsertCrmConversationCycleContextInput,
} from "../../../domains/crm/ports/crmConversationRepository.js";
import { shouldBackfillCrmMessagingPhone } from "../../../domains/crm/messaging/contactIdentity.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  readRecord,
  type CanonicalConversationCycleRow,
} from "./drizzleCrmConversationMappers.js";

export function toCanonicalAttendance(state: CrmHumanAttendanceState | null) {
  if (state === "WAITING_HUMAN") return "handoff_requested" as const;
  if (state === "IN_HUMAN_SERVICE") return "human_active" as const;
  return "bot_active" as const;
}

export function cleanAttendanceUpdate(
  input: UpdateCrmConversationCycleInput,
  current: typeof conversationAttendances.$inferSelect,
) {
  const assignedAt =
    input.lastAssignedAt !== undefined
      ? input.lastAssignedAt
      : input.assignedUserId !== undefined && input.assignedUserId !== null
        ? (current.assignedAt ?? new Date())
        : input.assignedUserId === null
          ? null
          : current.assignedAt;
  return {
    ...(input.assignedUserId !== undefined
      ? { assignedUserId: input.assignedUserId, assignedAt }
      : {}),
    ...(input.humanAttendanceChangedAt !== undefined
      ? { changedAt: input.humanAttendanceChangedAt ?? new Date() }
      : {}),
    ...(input.humanAttendanceState !== undefined
      ? {
          state: toCanonicalAttendance(input.humanAttendanceState),
          ...(input.humanAttendanceState === "WAITING_HUMAN"
            ? { handoffRequestedAt: input.humanTakeoverAt ?? new Date() }
            : {}),
        }
      : {}),
    ...(input.humanAttendanceStateVersion !== undefined
      ? { stateVersion: input.humanAttendanceStateVersion ?? 0 }
      : {}),
    ...(input.humanHandlingStartedAt !== undefined
      ? { handlingStartedAt: input.humanHandlingStartedAt }
      : {}),
    ...(input.humanTakeoverAt !== undefined
      ? { handoffRequestedAt: input.humanTakeoverAt }
      : {}),
    ...(input.interventionId !== undefined
      ? { interventionId: input.interventionId }
      : {}),
    ...(input.lastAssignedAt !== undefined
      ? { assignedAt: input.lastAssignedAt }
      : {}),
    ...(hasAttendanceMutation(input)
      ? {
          revision: sql`${conversationAttendances.revision} + 1`,
          updatedAt: new Date(),
        }
      : {}),
  };
}

export function matchesExpectedAttendanceState(
  current: typeof conversationAttendances.$inferSelect,
  input: UpdateCrmConversationCycleInput,
) {
  if (
    input.expectedHumanAttendanceStateVersion !== undefined &&
    (current.stateVersion || null) !== input.expectedHumanAttendanceStateVersion
  )
    return false;
  return (
    input.expectedInterventionId === undefined ||
    current.interventionId === input.expectedInterventionId
  );
}

function hasAttendanceMutation(input: UpdateCrmConversationCycleInput) {
  return (
    input.assignedUserId !== undefined ||
    input.humanAttendanceChangedAt !== undefined ||
    input.humanAttendanceState !== undefined ||
    input.humanAttendanceStateVersion !== undefined ||
    input.humanHandlingStartedAt !== undefined ||
    input.humanTakeoverAt !== undefined ||
    input.interventionId !== undefined ||
    input.lastAssignedAt !== undefined
  );
}

export async function createCanonicalCycle(
  db: DrizzleCrmClient,
  input: UpsertCrmConversationCycleContextInput | IngestCrmMessageInput,
  thread: typeof conversationThreads.$inferSelect,
): Promise<CanonicalConversationCycleRow> {
  const ingest = "providerTimestamp" in input ? input : null;
  const [cycle] = await db
    .insert(conversationCycles)
    .values({
      firstHandledAt: ingest?.firstHandledAt ?? null,
      freshLeadAt: ingest?.freshLeadAt ?? null,
      lastMessageAt: ingest?.providerTimestamp ?? null,
      lastMessageContent: ingest?.content ?? null,
      metadata: {
        ...(ingest?.leadId ? { leadId: ingest.leadId } : {}),
        cycleMetadata: {},
        sessionStatus: "ACTIVE",
      },
      threadId: thread.id,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .returning();
  if (!cycle)
    throw new Error("Canonical CRM conversation cycle was not persisted.");
  const [attendance] = await db
    .insert(conversationAttendances)
    .values({
      cycleId: cycle.id,
      threadId: thread.id,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .returning();
  if (!attendance)
    throw new Error("Canonical CRM attendance was not persisted.");
  return { attendance, cycle, thread };
}

export async function updateConversationCyclePreview(
  db: DrizzleCrmClient,
  input: IngestCrmMessageInput,
  conversationCycle: CanonicalConversationCycleRow & { created: boolean },
) {
  const now = new Date();
  const cycleMetadata = readRecord(conversationCycle.cycle.metadata);
  await db
    .update(conversationThreads)
    .set({
      ...(shouldBackfillCrmMessagingPhone(
        conversationCycle.thread.customerPhone ?? "",
        input.customerPhone,
        Boolean(
          input.customerChatId &&
          conversationCycle.thread.customerChatId === input.customerChatId,
        ),
      )
        ? { customerPhone: input.customerPhone }
        : {}),
      ...(input.customerChatId ? { customerChatId: input.customerChatId } : {}),
      ...(!conversationCycle.thread.customerDisplayName &&
      input.customerDisplayName
        ? { customerDisplayName: input.customerDisplayName }
        : {}),
      ...newerThreadPreview(input),
      revision: sql`${conversationThreads.revision} + 1`,
      state: "open",
      updatedAt: now,
    })
    .where(
      and(
        eq(conversationThreads.id, conversationCycle.thread.id),
        eq(conversationThreads.storeId, input.storeId),
        eq(conversationThreads.tenantId, input.tenantId),
      ),
    );

  await db
    .update(conversationCycles)
    .set({
      ...(input.direction === "OUTBOUND" && input.firstHandledAt
        ? {
            firstHandledAt:
              conversationCycle.cycle.firstHandledAt ?? input.firstHandledAt,
          }
        : {}),
      ...(input.direction === "INBOUND"
        ? {
            freshLeadAt:
              conversationCycle.cycle.freshLeadAt ??
              input.freshLeadAt ??
              input.providerTimestamp,
            state: "active" as const,
          }
        : {}),
      ...crmNewerConversationMessagePreview(input),
      metadata: {
        ...cycleMetadata,
        ...(input.leadId ? { leadId: input.leadId } : {}),
        ...(input.direction === "INBOUND" &&
        conversationCycle.attendance.state === "bot_active"
          ? { sessionStatus: "ACTIVE" }
          : {}),
      },
      messageCount: sql`${conversationCycles.messageCount} + 1`,
      revision: sql`${conversationCycles.revision} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(conversationCycles.id, conversationCycle.cycle.id),
        eq(conversationCycles.storeId, input.storeId),
        eq(conversationCycles.tenantId, input.tenantId),
      ),
    );
}

export function crmNewerConversationMessagePreview(
  input: IngestCrmMessageInput,
) {
  const providerTimestamp = input.providerTimestamp.toISOString();
  const providerTimestampSql = sql`${providerTimestamp}::timestamptz`;
  const isNewerPreview = sql`${conversationCycles.lastMessageAt} is null or ${providerTimestampSql} > ${conversationCycles.lastMessageAt}`;
  return {
    lastMessageAt: sql`case when ${isNewerPreview} then ${providerTimestampSql} else ${conversationCycles.lastMessageAt} end`,
    lastMessageContent: sql`case when ${isNewerPreview} then ${input.content} else ${conversationCycles.lastMessageContent} end`,
  };
}

function newerThreadPreview(input: IngestCrmMessageInput) {
  const providerTimestampSql = sql`${input.providerTimestamp.toISOString()}::timestamptz`;
  return {
    lastMessageAt: sql`case when ${conversationThreads.lastMessageAt} is null or ${providerTimestampSql} > ${conversationThreads.lastMessageAt} then ${providerTimestampSql} else ${conversationThreads.lastMessageAt} end`,
  };
}
