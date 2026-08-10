import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { crmWhatsappOutboundIntents } from "@lojaveiculosv2/db";
import type { CrmWhatsappOutboundIntentRepository } from "../../../domains/crm/ports/crmWhatsappOutboundIntentRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export function createDrizzleCrmWhatsappOutboundIntentRepository(
  db: DrizzleCrmClient,
): CrmWhatsappOutboundIntentRepository {
  return {
    async claim(input) {
      const claimToken = randomUUID();
      const [inserted] = await db
        .insert(crmWhatsappOutboundIntents)
        .values({
          claimToken,
          connectionId: input.connectionId,
          fingerprint: input.fingerprint,
          idempotencyKey: input.idempotencyKey,
          sessionId: input.sessionId,
          startedAt: input.now,
          storeId: input.storeId,
          tenantId: input.tenantId,
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
        kind: existing.status === "started" ? "in_progress" : existing.status,
      };
    },
    async complete(input) {
      await db
        .update(crmWhatsappOutboundIntents)
        .set({
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
          sessionId: input.sessionId,
          status: "completed",
        })
        .where(owned(input));
    },
    async markIndeterminate(input) {
      await db
        .update(crmWhatsappOutboundIntents)
        .set({ status: "indeterminate" })
        .where(owned(input));
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
