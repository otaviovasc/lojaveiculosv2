import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import {
  canonicalMessages,
  crmWhatsappOutboundIntents,
} from "@lojaveiculosv2/db";
import type { CrmWhatsappOutboundIntentRepository } from "../../../domains/crm/ports/crmWhatsappOutboundIntentRepository.js";
import { findCanonicalThreadIdForCycle } from "./drizzleCrmCanonicalWorkflowReferences.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export function createDrizzleCrmWhatsappOutboundIntentRepository(
  db: DrizzleCrmClient,
): CrmWhatsappOutboundIntentRepository {
  return {
    async claim(input) {
      const claimToken = randomUUID();
      const threadId = input.sessionId
        ? await findCanonicalThreadIdForCycle(db, {
            connectionId: input.connectionId,
            cycleId: input.sessionId,
            storeId: input.storeId,
            tenantId: input.tenantId,
          })
        : null;
      const [inserted] = await db
        .insert(crmWhatsappOutboundIntents)
        .values({
          claimToken,
          connectionId: input.connectionId,
          cycleId: input.sessionId,
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
        .from(crmWhatsappOutboundIntents)
        .where(
          and(
            eq(crmWhatsappOutboundIntents.tenantId, input.tenantId),
            eq(crmWhatsappOutboundIntents.storeId, input.storeId),
            eq(crmWhatsappOutboundIntents.idempotencyKey, input.idempotencyKey),
          ),
        )
        .limit(1);
      if (!existing || existing.fingerprint !== input.fingerprint)
        return { kind: "conflict" };
      if (existing.status === "retryable_failed") {
        const [retried] = await db
          .update(crmWhatsappOutboundIntents)
          .set({
            claimToken,
            providerResult: null,
            startedAt: input.now,
            status: "started",
          })
          .where(
            and(
              eq(crmWhatsappOutboundIntents.id, existing.id),
              eq(crmWhatsappOutboundIntents.status, "retryable_failed"),
            ),
          )
          .returning();
        if (retried) return { intent: map(retried), kind: "claimed" };
        const [concurrent] = await db
          .select()
          .from(crmWhatsappOutboundIntents)
          .where(eq(crmWhatsappOutboundIntents.id, existing.id))
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
          .update(crmWhatsappOutboundIntents)
          .set({ status: "indeterminate" })
          .where(
            and(
              eq(crmWhatsappOutboundIntents.id, existing.id),
              eq(crmWhatsappOutboundIntents.status, "started"),
              lte(crmWhatsappOutboundIntents.startedAt, input.staleBefore),
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
        .update(crmWhatsappOutboundIntents)
        .set({
          cycleId: input.sessionId,
          messageId: input.messageId,
          providerResult: sql`jsonb_build_object(
          'externalId', coalesce(
            ${crmWhatsappOutboundIntents.providerResult}->>'externalId',
            ${crmWhatsappOutboundIntents.providerResult}->'sent'->>'externalId'
          ),
          'providerTimestamp', coalesce(
            ${crmWhatsappOutboundIntents.providerResult}->>'providerTimestamp',
            ${crmWhatsappOutboundIntents.providerResult}->'sent'->>'providerTimestamp'
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
        .update(crmWhatsappOutboundIntents)
        .set({ status: "indeterminate" })
        .where(owned(input));
    },
    async recordProviderFailure(input) {
      await db
        .update(crmWhatsappOutboundIntents)
        .set({
          providerResult: input.failure,
          recoveryExpiresAt: null,
          status: input.retryable ? "retryable_failed" : "failed",
        })
        .where(
          and(owned(input), eq(crmWhatsappOutboundIntents.status, "started")),
        );
    },
    async recordProviderSuccess(input) {
      await db
        .update(crmWhatsappOutboundIntents)
        .set({
          providerResult: input.providerResult,
          recoveryExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
          status: "provider_succeeded",
        })
        .where(
          and(owned(input), eq(crmWhatsappOutboundIntents.status, "started")),
        );
    },
    async purgeExpiredRecoveryPayloads(input) {
      const expired = await db
        .select({ id: crmWhatsappOutboundIntents.id })
        .from(crmWhatsappOutboundIntents)
        .where(
          and(
            isNotNull(crmWhatsappOutboundIntents.providerResult),
            lte(crmWhatsappOutboundIntents.recoveryExpiresAt, input.now),
          ),
        )
        .limit(input.limit);
      if (!expired.length) return 0;
      const cleared = await db
        .update(crmWhatsappOutboundIntents)
        .set({
          providerResult: null,
          recoveryExpiresAt: null,
          status: "indeterminate",
        })
        .where(
          inArray(
            crmWhatsappOutboundIntents.id,
            expired.map((row) => row.id),
          ),
        )
        .returning({ id: crmWhatsappOutboundIntents.id });
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
    sessionId: string;
  },
) {
  const [row] = await db
    .select({ threadId: canonicalMessages.threadId })
    .from(canonicalMessages)
    .innerJoin(
      crmWhatsappOutboundIntents,
      and(
        eq(crmWhatsappOutboundIntents.tenantId, canonicalMessages.tenantId),
        eq(crmWhatsappOutboundIntents.storeId, canonicalMessages.storeId),
        eq(
          crmWhatsappOutboundIntents.connectionId,
          canonicalMessages.providerConnectionId,
        ),
      ),
    )
    .where(
      and(
        owned(input),
        eq(canonicalMessages.id, input.messageId),
        eq(canonicalMessages.cycleId, input.sessionId),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Canonical CRM outbound message was not found.");
  return row;
}

function owned(input: { claimToken: string; id: string }) {
  return and(
    eq(crmWhatsappOutboundIntents.id, input.id),
    eq(crmWhatsappOutboundIntents.claimToken, input.claimToken),
  );
}

function map(row: typeof crmWhatsappOutboundIntents.$inferSelect) {
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
