import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { crmMessages, crmOutboundIntents } from "@lojaveiculosv2/db";
import type { CrmOutboundIntentRepository } from "../../../domains/crm/ports/crmOutboundIntentRepository.js";
import { findCanonicalThreadIdForCycle } from "./drizzleCrmCanonicalWorkflowReferences.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export function createDrizzleCrmOutboundIntentRepository(
  db: DrizzleCrmClient,
): CrmOutboundIntentRepository {
  return {
    async claim(input) {
      const claimToken = randomUUID();
      const threadId = input.cycleId
        ? await findCanonicalThreadIdForCycle(db, {
            connectionId: input.connectionId,
            cycleId: input.cycleId,
            storeId: input.storeId,
            tenantId: input.tenantId,
          })
        : null;
      const [inserted] = await db
        .insert(crmOutboundIntents)
        .values({
          claimToken,
          connectionId: input.connectionId,
          cycleId: input.cycleId,
          fingerprint: input.fingerprint,
          idempotencyKey: input.idempotencyKey,
          startedAt: input.now,
          storeId: input.storeId,
          tenantId: input.tenantId,
          threadId,
        })
        .onConflictDoNothing()
        .returning();
      if (inserted) return { intent: map(inserted), kind: "claimed" };
      const [existing] = await db
        .select()
        .from(crmOutboundIntents)
        .where(
          and(
            eq(crmOutboundIntents.tenantId, input.tenantId),
            eq(crmOutboundIntents.storeId, input.storeId),
            eq(crmOutboundIntents.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1);
      if (!existing || existing.fingerprint !== input.fingerprint)
        return { kind: "conflict" };
      if (existing.status === "retryable_failed") {
        const [retried] = await db
          .update(crmOutboundIntents)
          .set({
            claimToken,
            providerResult: null,
            startedAt: input.now,
            status: "started",
          })
          .where(
            and(
              eq(crmOutboundIntents.id, existing.id),
              eq(crmOutboundIntents.status, "retryable_failed"),
            ),
          )
          .returning();
        if (retried) return { intent: map(retried), kind: "claimed" };
        const [concurrent] = await db
          .select()
          .from(crmOutboundIntents)
          .where(eq(crmOutboundIntents.id, existing.id))
          .limit(1);
        if (concurrent) {
          return {
            intent: map(concurrent),
            kind:
              concurrent.status === "started" ||
              concurrent.status === "retryable_failed"
                ? "in_progress"
                : concurrent.status,
          };
        }
      }
      if (
        existing.status === "started" &&
        existing.startedAt <= input.staleBefore
      ) {
        const [stale] = await db
          .update(crmOutboundIntents)
          .set({ status: "indeterminate" })
          .where(
            and(
              eq(crmOutboundIntents.id, existing.id),
              eq(crmOutboundIntents.status, "started"),
              lte(crmOutboundIntents.startedAt, input.staleBefore),
            ),
          )
          .returning();
        if (stale) return { intent: map(stale), kind: "indeterminate" };
      }
      return {
        intent: map(existing),
        kind:
          existing.status === "started" ||
          existing.status === "retryable_failed"
            ? "in_progress"
            : existing.status,
      };
    },
    async complete(input) {
      const message = await findOwnedMessageContext(db, input);
      await db
        .update(crmOutboundIntents)
        .set({
          cycleId: input.cycleId,
          messageId: input.messageId,
          providerResult: sql`jsonb_build_object(
          'externalId', coalesce(
            ${crmOutboundIntents.providerResult}->>'externalId',
            ${crmOutboundIntents.providerResult}->'sent'->>'externalId'
          ),
          'providerTimestamp', coalesce(
            ${crmOutboundIntents.providerResult}->>'providerTimestamp',
            ${crmOutboundIntents.providerResult}->'sent'->>'providerTimestamp'
          )
        )`,
          recoveryExpiresAt: null,
          status: "completed",
          threadId: message.threadId,
        })
        .where(owned(input));
    },
    async markIndeterminate(input) {
      await db
        .update(crmOutboundIntents)
        .set({ status: "indeterminate" })
        .where(owned(input));
    },
    async recordProviderFailure(input) {
      await db
        .update(crmOutboundIntents)
        .set({
          providerResult: input.failure,
          recoveryExpiresAt: null,
          status: input.retryable ? "retryable_failed" : "failed",
        })
        .where(and(owned(input), eq(crmOutboundIntents.status, "started")));
    },
    async recordProviderSuccess(input) {
      await db
        .update(crmOutboundIntents)
        .set({
          providerResult: input.providerResult,
          recoveryExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
          status: "provider_succeeded",
        })
        .where(and(owned(input), eq(crmOutboundIntents.status, "started")));
    },
    async purgeExpiredRecoveryPayloads(input) {
      const expired = await db
        .select({ id: crmOutboundIntents.id })
        .from(crmOutboundIntents)
        .where(
          and(
            isNotNull(crmOutboundIntents.providerResult),
            lte(crmOutboundIntents.recoveryExpiresAt, input.now),
          ),
        )
        .limit(input.limit);
      if (!expired.length) return 0;
      const cleared = await db
        .update(crmOutboundIntents)
        .set({
          providerResult: null,
          recoveryExpiresAt: null,
          status: "indeterminate",
        })
        .where(
          inArray(
            crmOutboundIntents.id,
            expired.map((row) => row.id),
          ),
        )
        .returning({ id: crmOutboundIntents.id });
      return cleared.length;
    },
  };
}
async function findOwnedMessageContext(
  db: DrizzleCrmClient,
  input: {
    claimToken: string;
    id: string;
    messageId: string;
    cycleId: string;
  },
) {
  const [row] = await db
    .select({ threadId: crmMessages.threadId })
    .from(crmMessages)
    .innerJoin(
      crmOutboundIntents,
      and(
        eq(crmOutboundIntents.tenantId, crmMessages.tenantId),
        eq(crmOutboundIntents.storeId, crmMessages.storeId),
        eq(crmOutboundIntents.connectionId, crmMessages.providerConnectionId),
      ),
    )
    .where(
      and(
        owned(input),
        eq(crmMessages.id, input.messageId),
        eq(crmMessages.cycleId, input.cycleId),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Canonical CRM outbound message was not found.");
  return row;
}

function owned(input: { claimToken: string; id: string }) {
  return and(
    eq(crmOutboundIntents.id, input.id),
    eq(crmOutboundIntents.claimToken, input.claimToken),
  );
}

function map(row: typeof crmOutboundIntents.$inferSelect) {
  return {
    claimToken: row.claimToken,
    fingerprint: row.fingerprint,
    id: row.id,
    messageId: row.messageId,
    providerResult: row.providerResult as Record<string, unknown> | null,
    recoveryExpiresAt: row.recoveryExpiresAt,
    startedAt: row.startedAt,
    status: row.status,
  };
}
