import { and, desc, eq } from "drizzle-orm";
import { providerEvents } from "@lojaveiculosv2/db";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  CrmProviderWebhookEvent,
  CrmWebhookEventRepository,
} from "../../../domains/crm/ports/crmWebhookEventRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export function createDrizzleCrmWebhookEventRepository(
  db: DrizzleCrmClient,
): CrmWebhookEventRepository {
  return {
    async findById(input) {
      const [row] = await db
        .select()
        .from(providerEvents)
        .where(
          and(
            eq(providerEvents.id, input.eventId),
            eq(providerEvents.storeId, input.storeId),
            eq(providerEvents.tenantId, input.tenantId),
          ),
        )
        .limit(1);
      return row ? toWebhookEvent(row) : null;
    },
    async list(input) {
      const filters = [
        eq(providerEvents.storeId, input.storeId),
        eq(providerEvents.tenantId, input.tenantId),
      ];
      if (input.connectionId) {
        filters.push(eq(providerEvents.connectionId, input.connectionId));
      }
      if (input.eventType) {
        filters.push(eq(providerEvents.eventType, input.eventType));
      }
      if (input.provider) {
        filters.push(eq(providerEvents.provider, input.provider));
      }
      if (input.status) {
        filters.push(eq(providerEvents.status, input.status));
      }
      const rows = await db
        .select()
        .from(providerEvents)
        .where(and(...filters))
        .orderBy(desc(providerEvents.updatedAt))
        .offset(input.offset ?? 0)
        .limit(input.limit ?? 50);
      return rows.map(toWebhookEvent);
    },
    async recordReceived(input) {
      const [inserted] = await db
        .insert(providerEvents)
        .values({
          connectionId: input.connectionId ?? null,
          environment: input.environment,
          eventType: input.eventType,
          payload: input.payload,
          provider: input.provider,
          providerEventId: input.providerEventId,
          storeId: input.storeId ?? null,
          tenantId: input.tenantId ?? null,
        })
        .onConflictDoNothing({
          target: [
            providerEvents.provider,
            providerEvents.environment,
            providerEvents.providerEventId,
          ],
        })
        .returning();
      if (inserted) return { created: true, event: toWebhookEvent(inserted) };

      const [existing] = await db
        .select()
        .from(providerEvents)
        .where(
          and(
            eq(providerEvents.provider, input.provider),
            eq(providerEvents.environment, input.environment),
            eq(providerEvents.providerEventId, input.providerEventId),
          ),
        )
        .limit(1);
      if (!existing)
        throw new Error("Provider webhook event was not persisted.");
      return { created: false, event: toWebhookEvent(existing) };
    },
    async updateStatus(input) {
      const [row] = await db
        .update(providerEvents)
        .set({
          errorMessage: input.errorMessage ?? null,
          processedAt: new Date(),
          status: input.status,
        })
        .where(eq(providerEvents.id, input.eventId))
        .returning();
      return row ? toWebhookEvent(row) : null;
    },
  };
}

function toWebhookEvent(row: typeof providerEvents.$inferSelect) {
  return {
    createdAt: row.createdAt,
    connectionId: row.connectionId,
    environment: row.environment,
    errorMessage: row.errorMessage,
    eventType: row.eventType,
    id: row.id,
    payload: row.payload as Record<string, unknown>,
    processedAt: row.processedAt,
    provider: row.provider as "zapi",
    providerEventId: row.providerEventId,
    status: row.status,
    storeId: row.storeId as StoreId | null,
    tenantId: row.tenantId as TenantId | null,
    updatedAt: row.updatedAt,
  } satisfies CrmProviderWebhookEvent;
}
