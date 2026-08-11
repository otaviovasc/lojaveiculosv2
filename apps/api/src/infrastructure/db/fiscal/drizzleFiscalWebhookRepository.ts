import { and, eq } from "drizzle-orm";
import { providerEvents } from "@lojaveiculosv2/db";
import type {
  FiscalWebhookEventStatus,
  FiscalWebhookRepository,
} from "../../../domains/fiscal/ports/fiscalWebhookRepository.js";
import type { DrizzleFiscalClient } from "./drizzleFiscalRepository.js";

export function createDrizzleFiscalWebhookRepository(
  db: DrizzleFiscalClient,
  environment: string,
): FiscalWebhookRepository {
  return {
    async recordReceived(input) {
      const [created] = await db
        .insert(providerEvents)
        .values({
          environment,
          eventType: input.eventType,
          payload: input.payload,
          provider: "spedy",
          providerEventId: input.providerEventId,
        })
        .onConflictDoNothing()
        .returning();
      const [row] = created
        ? [created]
        : await db
            .select()
            .from(providerEvents)
            .where(
              and(
                eq(providerEvents.provider, "spedy"),
                eq(providerEvents.environment, environment),
                eq(providerEvents.providerEventId, input.providerEventId),
              ),
            )
            .limit(1);
      if (!row) throw new Error("Fiscal webhook event was not persisted.");
      return {
        created: Boolean(created),
        event: {
          id: row.id,
          providerEventId: row.providerEventId,
          status: row.status as FiscalWebhookEventStatus,
        },
      };
    },
    async updateStatus(input) {
      await db
        .update(providerEvents)
        .set({
          errorMessage: input.errorMessage ?? null,
          processedAt: new Date(),
          status: input.status,
          ...(input.storeId ? { storeId: input.storeId } : {}),
          ...(input.tenantId ? { tenantId: input.tenantId } : {}),
        })
        .where(eq(providerEvents.id, input.eventId));
    },
  };
}
