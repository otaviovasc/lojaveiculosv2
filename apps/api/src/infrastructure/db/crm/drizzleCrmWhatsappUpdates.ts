import { and, eq, isNull, type SQL } from "drizzle-orm";
import { crmWhatsappSessions } from "@lojaveiculosv2/db";
import type { UpdateCrmWhatsappSessionInput } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { toWhatsappSession } from "./drizzleCrmWhatsappMappers.js";
import { countUnreadMessages } from "./drizzleCrmWhatsappQueries.js";
import { hydrateWhatsappSession } from "./drizzleCrmWhatsappTags.js";

export async function updateWhatsappSession(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappSessionInput,
) {
  const [row] = await db
    .update(crmWhatsappSessions)
    .set(cleanSessionUpdate(input))
    .where(and(...sessionUpdateFilters(input)))
    .returning();
  if (!row) return null;
  return hydrateWhatsappSession(
    db,
    toWhatsappSession(row, await countUnreadMessages(db, row)),
  );
}

function sessionUpdateFilters(input: UpdateCrmWhatsappSessionInput): SQL[] {
  const filters: SQL[] = [
    eq(crmWhatsappSessions.id, input.sessionId),
    eq(crmWhatsappSessions.storeId, input.storeId),
    eq(crmWhatsappSessions.tenantId, input.tenantId),
  ];
  if (input.expectedStatus) {
    filters.push(eq(crmWhatsappSessions.status, input.expectedStatus));
  }
  if (input.expectedHumanAttendanceStateVersion !== undefined) {
    filters.push(
      input.expectedHumanAttendanceStateVersion === null
        ? isNull(crmWhatsappSessions.humanAttendanceStateVersion)
        : eq(
            crmWhatsappSessions.humanAttendanceStateVersion,
            input.expectedHumanAttendanceStateVersion,
          ),
    );
  }
  if (input.expectedInterventionId !== undefined) {
    filters.push(
      input.expectedInterventionId === null
        ? isNull(crmWhatsappSessions.interventionId)
        : eq(crmWhatsappSessions.interventionId, input.expectedInterventionId),
    );
  }
  return filters;
}

export function cleanSessionUpdate(input: UpdateCrmWhatsappSessionInput) {
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
    ...(input.humanAttendanceChangedAt !== undefined
      ? { humanAttendanceChangedAt: input.humanAttendanceChangedAt }
      : {}),
    ...(input.humanAttendanceState !== undefined
      ? { humanAttendanceState: input.humanAttendanceState }
      : {}),
    ...(input.humanAttendanceStateVersion !== undefined
      ? { humanAttendanceStateVersion: input.humanAttendanceStateVersion }
      : {}),
    ...(input.humanHandlingStartedAt !== undefined
      ? { humanHandlingStartedAt: input.humanHandlingStartedAt }
      : {}),
    ...(input.humanTakeoverAt !== undefined
      ? { humanTakeoverAt: input.humanTakeoverAt }
      : {}),
    ...(input.interventionId !== undefined
      ? { interventionId: input.interventionId }
      : {}),
    ...(input.lastAssignedAt !== undefined
      ? { lastAssignedAt: input.lastAssignedAt }
      : {}),
    ...(input.lastCustomerReadAt !== undefined
      ? { lastCustomerReadAt: input.lastCustomerReadAt }
      : {}),
    ...(input.lastReadAt !== undefined ? { lastReadAt: input.lastReadAt } : {}),
    ...(input.leadId !== undefined ? { leadId: input.leadId } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
    ...(input.status ? { status: input.status } : {}),
    updatedAt: new Date(),
  };
}
