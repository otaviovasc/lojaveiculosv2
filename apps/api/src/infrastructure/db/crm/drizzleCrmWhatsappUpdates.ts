import { and, eq } from "drizzle-orm";
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
    .where(
      and(
        eq(crmWhatsappSessions.id, input.sessionId),
        eq(crmWhatsappSessions.storeId, input.storeId),
        eq(crmWhatsappSessions.tenantId, input.tenantId),
      ),
    )
    .returning();
  if (!row) return null;
  return hydrateWhatsappSession(
    db,
    toWhatsappSession(row, await countUnreadMessages(db, row)),
  );
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
    ...(input.humanTakeoverAt !== undefined
      ? { humanTakeoverAt: input.humanTakeoverAt }
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
