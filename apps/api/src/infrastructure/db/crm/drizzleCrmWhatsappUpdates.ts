import {
  conversationAttendances,
  conversationCycles,
  conversationThreads,
} from "@lojaveiculosv2/db";
import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import type { UpdateCrmWhatsappSessionInput } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { readRecord, toWhatsappSession } from "./drizzleCrmWhatsappMappers.js";
import {
  cleanAttendanceUpdate,
  matchesExpectedAttendanceState,
} from "./drizzleCrmWhatsappSessionPreview.js";
import { persistAttendanceTransitionEventIfChanged } from "./drizzleCrmWhatsappAttendanceEvents.js";
import {
  canonicalSessionSelection,
  countUnreadMessages,
} from "./drizzleCrmWhatsappQueries.js";
import { hydrateWhatsappSession } from "./drizzleCrmWhatsappTagHydration.js";

export async function updateWhatsappSession(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionInput,
) {
  const current = await findCanonicalSession(db, input);
  if (!current || !matchesExpectedAttendanceState(current.attendance, input))
    return null;
  const [cycle] = await db
    .update(conversationCycles)
    .set(cleanSessionUpdate(input, current.cycle.metadata))
    .where(and(...sessionUpdateFilters(input)))
    .returning();
  if (!cycle) return null;

  if (input.status) {
    await db
      .update(conversationThreads)
      .set({
        revision: sql`${conversationThreads.revision} + 1`,
        state: ["COMPLETED", "EXPIRED"].includes(input.status)
          ? "resolved"
          : "open",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(conversationThreads.id, current.thread.id),
          eq(conversationThreads.storeId, input.storeId),
          eq(conversationThreads.tenantId, input.tenantId),
        ),
      );
  }

  const attendancePatch = cleanAttendanceUpdate(input, current.attendance);
  const nextAttendanceState = attendancePatch.state ?? current.attendance.state;
  await persistAttendanceTransitionEventIfChanged({
    current: current.attendance,
    db,
    nextState: nextAttendanceState,
    update: input,
  });
  const [attendance] = Object.keys(attendancePatch).length
    ? await db
        .update(conversationAttendances)
        .set(attendancePatch)
        .where(
          and(
            eq(conversationAttendances.cycleId, input.sessionId),
            eq(conversationAttendances.storeId, input.storeId),
            eq(conversationAttendances.tenantId, input.tenantId),
            eq(conversationAttendances.state, current.attendance.state),
            eq(
              conversationAttendances.stateVersion,
              current.attendance.stateVersion,
            ),
            current.attendance.interventionId === null
              ? isNull(conversationAttendances.interventionId)
              : eq(
                  conversationAttendances.interventionId,
                  current.attendance.interventionId,
                ),
          ),
        )
        .returning()
    : [current.attendance];
  if (!attendance) throw new Error("Canonical CRM attendance was not found.");
  const row = { attendance, cycle, thread: current.thread };
  return hydrateWhatsappSession(
    db,
    toWhatsappSession(row, await countUnreadMessages(db, row)),
  );
}

export function updateWhatsappSessionWithTransaction(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionInput,
  disableTransactions: boolean,
) {
  const execute = (client: DrizzleCrmClient) =>
    updateWhatsappSession(client, input);
  return disableTransactions
    ? execute(db)
    : db.transaction(async (tx) => execute(tx as DrizzleCrmClient));
}

export function sessionUpdateFilters(
  input: UpdateCrmWhatsappSessionInput,
): SQL[] {
  const filters: SQL[] = [
    eq(conversationCycles.id, input.sessionId),
    eq(conversationCycles.storeId, input.storeId),
    eq(conversationCycles.tenantId, input.tenantId),
  ];
  if (input.expectedRevision !== undefined)
    filters.push(eq(conversationCycles.revision, input.expectedRevision));
  if (input.expectedStatus)
    filters.push(expectedStatusSql(input.expectedStatus));
  if (input.expectedHumanAttendanceStateVersion !== undefined) {
    filters.push(
      sql`exists (select 1 from ${conversationAttendances} where ${conversationAttendances.cycleId} = ${conversationCycles.id} and ${conversationAttendances.stateVersion} = ${input.expectedHumanAttendanceStateVersion ?? 0})`,
    );
  }
  if (input.expectedInterventionId !== undefined) {
    filters.push(
      sql`exists (select 1 from ${conversationAttendances} where ${conversationAttendances.cycleId} = ${conversationCycles.id} and ${input.expectedInterventionId === null ? isNull(conversationAttendances.interventionId) : eq(conversationAttendances.interventionId, input.expectedInterventionId)})`,
    );
  }
  return filters;
}

export function cleanSessionUpdate(
  input: UpdateCrmWhatsappSessionInput,
  persistedMetadata: unknown = {},
) {
  const metadata = readRecord(persistedMetadata);
  return {
    ...(input.assignedUserId !== undefined
      ? { assignedUserId: input.assignedUserId }
      : {}),
    ...(input.firstHandledAt !== undefined
      ? { firstHandledAt: input.firstHandledAt }
      : {}),
    ...(input.freshLeadAt !== undefined
      ? { freshLeadAt: input.freshLeadAt }
      : {}),
    ...(input.lastCustomerReadAt !== undefined
      ? { lastCustomerReadAt: input.lastCustomerReadAt }
      : {}),
    ...(input.lastReadAt !== undefined ? { lastReadAt: input.lastReadAt } : {}),
    ...(input.status ? canonicalStatusUpdate(input.status) : {}),
    metadata: {
      ...metadata,
      ...(input.leadId !== undefined ? { leadId: input.leadId } : {}),
      ...(input.metadata ? { sessionMetadata: input.metadata } : {}),
      ...(input.status ? { sessionStatus: input.status } : {}),
    },
    revision: sql`${conversationCycles.revision} + 1`,
    updatedAt: new Date(),
  };
}

function canonicalStatusUpdate(
  status: NonNullable<UpdateCrmWhatsappSessionInput["status"]>,
) {
  switch (status) {
    case "COMPLETED":
      return { closedAt: new Date(), state: "completed" as const };
    case "EXPIRED":
      return { closedAt: new Date(), state: "expired" as const };
    case "ACTIVE":
    case "HUMAN_TAKEOVER":
    case "MINIBOT_ACTIVE":
      return { closedAt: null, state: "active" as const };
  }
}

function expectedStatusSql(
  status: NonNullable<UpdateCrmWhatsappSessionInput["expectedStatus"]>,
): SQL {
  switch (status) {
    case "COMPLETED":
      return eq(conversationCycles.state, "completed");
    case "EXPIRED":
      return eq(conversationCycles.state, "expired");
    case "ACTIVE":
      return and(
        eq(conversationCycles.state, "active"),
        sql`coalesce(${conversationCycles.metadata}->>'sessionStatus', 'ACTIVE') = 'ACTIVE'`,
      )!;
    case "MINIBOT_ACTIVE":
      return and(
        eq(conversationCycles.state, "active"),
        sql`${conversationCycles.metadata}->>'sessionStatus' = 'MINIBOT_ACTIVE'`,
      )!;
    case "HUMAN_TAKEOVER":
      return and(
        eq(conversationCycles.state, "active"),
        sql`exists (select 1 from ${conversationAttendances} where ${conversationAttendances.cycleId} = ${conversationCycles.id} and ${conversationAttendances.state} in ('handoff_requested', 'human_claimed', 'human_active'))`,
      )!;
  }
}

async function findCanonicalSession(
  db: DrizzleCrmClient,
  input: Pick<
    UpdateCrmWhatsappSessionInput,
    "sessionId" | "storeId" | "tenantId"
  >,
) {
  const [row] = await db
    .select(canonicalSessionSelection())
    .from(conversationCycles)
    .innerJoin(
      conversationThreads,
      eq(conversationCycles.threadId, conversationThreads.id),
    )
    .innerJoin(
      conversationAttendances,
      eq(conversationAttendances.cycleId, conversationCycles.id),
    )
    .where(
      and(
        eq(conversationCycles.id, input.sessionId),
        eq(conversationCycles.storeId, input.storeId),
        eq(conversationCycles.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return row;
}
