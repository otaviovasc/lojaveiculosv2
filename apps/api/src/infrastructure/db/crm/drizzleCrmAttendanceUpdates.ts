import { conversationAttendances } from "@lojaveiculosv2/db";
import { and, eq, isNull } from "drizzle-orm";
import type { UpdateCrmConversationCycleInput } from "../../../domains/crm/ports/crmConversationRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { cleanAttendanceUpdate } from "./drizzleCrmConversationCyclePreview.js";

type Attendance = typeof conversationAttendances.$inferSelect;

export function changesAttendanceState(
  current: Attendance,
  input: UpdateCrmConversationCycleInput,
) {
  const next = cleanAttendanceUpdate(input, current).state;
  return next !== undefined && next !== current.state;
}

export async function updateConversationAttendance(
  db: DrizzleCrmClient,
  input: UpdateCrmConversationCycleInput,
  current: Attendance,
) {
  const patch = cleanAttendanceUpdate(input, current);
  if (Object.keys(patch).length === 0) return current;
  const [attendance] = await db
    .update(conversationAttendances)
    .set(patch)
    .where(
      and(
        eq(conversationAttendances.cycleId, input.cycleId),
        eq(conversationAttendances.storeId, input.storeId),
        eq(conversationAttendances.tenantId, input.tenantId),
        eq(conversationAttendances.state, current.state),
        eq(conversationAttendances.stateVersion, current.stateVersion),
        current.interventionId === null
          ? isNull(conversationAttendances.interventionId)
          : eq(conversationAttendances.interventionId, current.interventionId),
      ),
    )
    .returning();
  return attendance ?? null;
}
