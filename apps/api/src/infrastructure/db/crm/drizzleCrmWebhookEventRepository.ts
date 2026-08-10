import { and, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
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
    async claimForProcessing(input) {
      const directlyClaimable = [
        eq(providerEvents.status, "failed"),
        eq(providerEvents.status, "received"),
      ];
      if (input.allowIgnored) {
        directlyClaimable.push(eq(providerEvents.status, "ignored"));
      }
      const [row] = await db
        .update(providerEvents)
        .set({
          errorMessage: null,
          processedAt: null,
          processingAttempts: sql`${providerEvents.processingAttempts} + 1`,
          processingStartedAt: input.processingStartedAt,
          processingToken: input.processingToken,
          status: "processing",
          updatedAt: input.processingStartedAt,
        })
        .where(
          and(
            eq(providerEvents.id, input.eventId),
            or(
              ...directlyClaimable,
              and(
                eq(providerEvents.status, "processing"),
                or(
                  isNull(providerEvents.processingStartedAt),
                  lte(providerEvents.processingStartedAt, input.staleBefore),
                ),
              ),
            ),
          ),
        )
        .returning();
      return row ? toWebhookEvent(row) : null;
    },
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
      const filters = [eq(providerEvents.id, input.eventId)];
      if (input.processingToken) {
        filters.push(
          eq(providerEvents.status, "processing"),
          eq(providerEvents.processingToken, input.processingToken),
        );
      }
      const [row] = await db
        .update(providerEvents)
        .set({
          errorMessage: input.errorMessage ?? null,
          processedAt: new Date(),
          processingStartedAt: null,
          processingToken: null,
          status: input.status,
        })
        .where(and(...filters))
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
    processingAttempts: row.processingAttempts,
    processingStartedAt: row.processingStartedAt,
    processingToken: row.processingToken,
    processedAt: row.processedAt,
    provider: row.provider as CrmProviderWebhookEvent["provider"],
    providerEventId: row.providerEventId,
    status: row.status,
    storeId: row.storeId as StoreId | null,
    tenantId: row.tenantId as TenantId | null,
    updatedAt: row.updatedAt,
  } satisfies CrmProviderWebhookEvent;
}
