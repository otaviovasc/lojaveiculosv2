import {
  and,
  asc,
  eq,
  inArray,
  isNull,
  lt,
  lte,
  ne,
  notExists,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { crmWebhookEffectOutbox } from "@lojaveiculosv2/db";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  CrmWebhookEffect,
  CrmWebhookEventRepository,
} from "../../../domains/crm/ports/crmWebhookEventRepository.js";
import { findCanonicalMessageContext } from "./drizzleCrmCanonicalWorkflowReferences.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

type EffectRepository = Pick<
  CrmWebhookEventRepository,
  | "claimEffect"
  | "claimDueEffects"
  | "completeEffect"
  | "failEffect"
  | "listEffects"
  | "stageEffects"
>;

export function createDrizzleCrmWebhookEffects(
  db: DrizzleCrmClient,
): EffectRepository {
  return {
    claimDueEffects: (input) =>
      db.transaction(async (transaction) => {
        const client = transaction as DrizzleCrmClient;
        const candidates = await client
          .select({ id: crmWebhookEffectOutbox.id })
          .from(crmWebhookEffectOutbox)
          .where(effectClaimFilter(client, input))
          .orderBy(
            asc(crmWebhookEffectOutbox.nextAttemptAt),
            asc(crmWebhookEffectOutbox.sequence),
          )
          .limit(input.limit)
          .for("update", { skipLocked: true });
        if (candidates.length === 0) return [];
        const rows = await client
          .update(crmWebhookEffectOutbox)
          .set(claimValues(input.now, input.processingToken))
          .where(
            inArray(
              crmWebhookEffectOutbox.id,
              candidates.map(({ id }) => id),
            ),
          )
          .returning();
        return rows.map(toWebhookEffect);
      }),
    async claimEffect(input) {
      const [row] = await db
        .update(crmWebhookEffectOutbox)
        .set(claimValues(input.processingStartedAt, input.processingToken))
        .where(
          and(
            eq(crmWebhookEffectOutbox.id, input.effectId),
            effectClaimFilter(db, input),
          ),
        )
        .returning();
      return row ? toWebhookEffect(row) : null;
    },
    async completeEffect(input) {
      const [row] = await db
        .update(crmWebhookEffectOutbox)
        .set({
          deliveredAt: input.deliveredAt,
          processingStartedAt: null,
          processingToken: null,
          status: "delivered",
          updatedAt: input.deliveredAt,
        })
        .where(
          and(
            eq(crmWebhookEffectOutbox.id, input.effectId),
            eq(crmWebhookEffectOutbox.status, "processing"),
            eq(crmWebhookEffectOutbox.processingToken, input.processingToken),
          ),
        )
        .returning();
      return row ? toWebhookEffect(row) : null;
    },
    async failEffect(input) {
      const [row] = await db
        .update(crmWebhookEffectOutbox)
        .set({
          deadLetteredAt: input.deadLetteredAt,
          lastErrorCode: input.lastErrorCode,
          nextAttemptAt: input.nextAttemptAt,
          processingStartedAt: null,
          processingToken: null,
          status: input.status,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(crmWebhookEffectOutbox.id, input.effectId),
            eq(crmWebhookEffectOutbox.status, "processing"),
            eq(crmWebhookEffectOutbox.processingToken, input.processingToken),
          ),
        )
        .returning();
      return row ? toWebhookEffect(row) : null;
    },
    async listEffects(providerEventId) {
      const rows = await db
        .select()
        .from(crmWebhookEffectOutbox)
        .where(eq(crmWebhookEffectOutbox.providerEventId, providerEventId))
        .orderBy(asc(crmWebhookEffectOutbox.sequence));
      return rows.map(toWebhookEffect);
    },
    async stageEffects(input) {
      const message = await findCanonicalMessageContext(db, {
        connectionId: input.connectionId,
        cycleId: input.sessionId,
        messageId: input.messageId,
        storeId: input.storeId,
        tenantId: input.tenantId,
      });
      await db
        .insert(crmWebhookEffectOutbox)
        .values(
          input.effects.map((effect) => ({
            connectionId: input.connectionId,
            cycleId: input.sessionId,
            effectType: effect.effectType,
            messageId: input.messageId,
            providerEventId: input.providerEventId,
            sequence: effect.sequence,
            storeId: input.storeId,
            tenantId: input.tenantId,
            threadId: message.threadId,
          })),
        )
        .onConflictDoNothing();
      const rows = await db
        .select()
        .from(crmWebhookEffectOutbox)
        .where(
          eq(crmWebhookEffectOutbox.providerEventId, input.providerEventId),
        )
        .orderBy(asc(crmWebhookEffectOutbox.sequence));
      return rows.map(toWebhookEffect);
    },
  };
}

function toWebhookEffect(row: typeof crmWebhookEffectOutbox.$inferSelect) {
  return {
    connectionId: row.connectionId,
    deadLetteredAt: row.deadLetteredAt,
    deliveredAt: row.deliveredAt,
    effectType: row.effectType,
    id: row.id,
    lastErrorCode: row.lastErrorCode,
    messageId: row.messageId,
    nextAttemptAt: row.nextAttemptAt,
    processingAttempts: row.processingAttempts,
    processingStartedAt: row.processingStartedAt,
    processingToken: row.processingToken,
    providerEventId: row.providerEventId,
    sequence: row.sequence,
    sessionId: row.cycleId,
    status: row.status,
    storeId: row.storeId as StoreId,
    tenantId: row.tenantId as TenantId,
  } satisfies CrmWebhookEffect;
}

function claimValues(processingStartedAt: Date, processingToken: string) {
  return {
    lastErrorCode: null,
    processingAttempts: sql`${crmWebhookEffectOutbox.processingAttempts} + 1`,
    processingStartedAt,
    processingToken,
    status: "processing" as const,
    updatedAt: processingStartedAt,
  };
}

function effectClaimFilter(
  db: DrizzleCrmClient,
  input: { maxAttempts: number; now: Date; staleBefore: Date },
) {
  const earlier = alias(crmWebhookEffectOutbox, "earlier_webhook_effect");
  return and(
    lt(crmWebhookEffectOutbox.processingAttempts, input.maxAttempts),
    or(
      and(
        inArray(crmWebhookEffectOutbox.status, ["pending", "failed"]),
        lte(crmWebhookEffectOutbox.nextAttemptAt, input.now),
      ),
      and(
        eq(crmWebhookEffectOutbox.status, "processing"),
        or(
          isNull(crmWebhookEffectOutbox.processingStartedAt),
          lte(crmWebhookEffectOutbox.processingStartedAt, input.staleBefore),
        ),
      ),
    ),
    notExists(
      db
        .select({ id: earlier.id })
        .from(earlier)
        .where(
          and(
            eq(earlier.providerEventId, crmWebhookEffectOutbox.providerEventId),
            lt(earlier.sequence, crmWebhookEffectOutbox.sequence),
            ne(earlier.status, "delivered"),
          ),
        ),
    ),
  );
}
