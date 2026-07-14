import { and, eq } from "drizzle-orm";
import { leadActivities } from "@lojaveiculosv2/db";
import type {
  CreateIdempotentLeadActivityInput,
  CreateIdempotentLeadActivityResult,
} from "../../../domains/crm/ports/crmRepository.js";
import { toActivity } from "./drizzleCrmMappers.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function createIdempotentCrmActivity(
  db: DrizzleCrmClient,
  input: CreateIdempotentLeadActivityInput,
): Promise<CreateIdempotentLeadActivityResult> {
  const [inserted] = await db
    .insert(leadActivities)
    .values({
      activityType: input.activityType,
      content: input.content,
      createdByUserId: input.createdByUserId ?? null,
      direction: input.direction ?? "internal",
      idempotencyFingerprint: input.idempotencyFingerprint,
      idempotencyKey: input.idempotencyKey,
      leadId: input.leadId,
      metadata: input.metadata ?? {},
      ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
      priority: input.priority ?? 0,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing({
      target: [leadActivities.storeId, leadActivities.idempotencyKey],
    })
    .returning();
  if (inserted) return { activity: toActivity(inserted), created: true };

  const [existing] = await db
    .select()
    .from(leadActivities)
    .where(
      and(
        eq(leadActivities.storeId, input.storeId),
        eq(leadActivities.tenantId, input.tenantId),
        eq(leadActivities.idempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1);
  if (!existing) {
    throw new Error("Idempotent activity conflict row was not found.");
  }
  return { activity: toActivity(existing), created: false };
}
