import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { loadLocalEnv } from "../../config/loadLocalEnv.js";
import {
  synchronizeExternalBotEffectOutcome,
  type AuthorizedExternalBotEffect,
} from "./drizzleExternalBotEffectRuntime.js";

loadLocalEnv();

const runRawDb = process.env.RUN_RAW_CRM_DB_TESTS === "true";

describe.skipIf(!runRawDb)(
  "external bot canonical outbound Postgres sync",
  () => {
    it("maps an independent canonical cycle and persists one replay-safe outbound", async () => {
      expect(process.env.DATABASE_URL).toBeTruthy();
      const sqlClient = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
      const db = drizzle(sqlClient, { schema });
      const rollback = Symbol("rollback bot canonical outbound validation");

      try {
        await db.transaction(async (transaction) => {
          const [scope] = await transaction
            .select({
              storeId: schema.stores.id,
              tenantId: schema.stores.tenantId,
            })
            .from(schema.stores)
            .limit(1);
          expect(
            scope,
            "Seed one store before raw CRM validation",
          ).toBeTruthy();
          if (!scope) throw new Error("Store scope is missing.");
          await transaction
            .update(schema.crmConnections)
            .set({ status: "archived" })
            .where(
              and(
                eq(schema.crmConnections.storeId, scope.storeId),
                eq(schema.crmConnections.provider, "zapi"),
              ),
            );

          const connectionId = randomUUID();
          const legacySessionId = randomUUID();
          const canonicalCycleId = randomUUID();
          const threadId = randomUUID();
          const messageId = randomUUID();
          const providerMessageId = `raw-bot-${randomUUID()}`;
          await transaction.insert(schema.crmConnections).values({
            displayName: "Raw bot sync Z-API",
            id: connectionId,
            provider: "zapi",
            status: "active",
            storeId: scope.storeId,
            tenantId: scope.tenantId,
          });
          await transaction.insert(schema.providerConnections).values({
            broker: "direct",
            channel: "whatsapp",
            displayName: "Raw bot sync Z-API",
            id: connectionId,
            provider: "zapi",
            state: "active",
            storeId: scope.storeId,
            tenantId: scope.tenantId,
          });
          await transaction.insert(schema.crmWhatsappSessions).values({
            buyerPhone: `5511${Date.now().toString().slice(-9)}`,
            connectionId,
            id: legacySessionId,
            storeId: scope.storeId,
            tenantId: scope.tenantId,
          });
          await transaction.insert(schema.conversationThreads).values({
            channel: "whatsapp",
            externalThreadId: `raw-thread-${randomUUID()}`,
            id: threadId,
            providerConnectionId: connectionId,
            storeId: scope.storeId,
            tenantId: scope.tenantId,
          });
          await transaction.insert(schema.conversationCycles).values({
            externalCycleId: `canonical-cycle-${randomUUID()}`,
            id: canonicalCycleId,
            threadId,
            storeId: scope.storeId,
            tenantId: scope.tenantId,
          });
          await transaction.insert(schema.crmWhatsappMessages).values({
            connectionId,
            content: "Provider-confirmed bot outbound",
            direction: "OUTBOUND",
            externalId: providerMessageId,
            id: messageId,
            senderOrigin: "bot_api",
            senderType: "AI",
            sessionId: legacySessionId,
            status: "SENT",
            storeId: scope.storeId,
            tenantId: scope.tenantId,
          });
          const effect: AuthorizedExternalBotEffect = {
            canonicalCycleId,
            command: {
              action: "message.send",
              payload: { text: "Provider-confirmed bot outbound" },
            },
            effectId: randomUUID(),
            expectedRevision: 0,
            idempotencyKey: `raw-idempotency-${randomUUID()}`,
            integrationId: randomUUID(),
            legacySessionId,
            legacySessionRevision: 0,
            modelVersion: "raw-test",
            provider: "zapi",
            providerConnectionId: connectionId,
            storeId: scope.storeId,
            tenantId: scope.tenantId,
            threadId,
          };

          await synchronizeExternalBotEffectOutcome(transaction, {
            effect,
            legacyMessageId: messageId,
          });
          await synchronizeExternalBotEffectOutcome(transaction, {
            effect,
            legacyMessageId: messageId,
          });

          const rows = await transaction
            .select({
              cycleId: schema.canonicalMessages.cycleId,
              metadata: schema.canonicalMessages.metadata,
              provider: schema.canonicalMessages.provider,
              providerConnectionId:
                schema.canonicalMessages.providerConnectionId,
              providerMessageId: schema.canonicalMessages.providerMessageId,
              threadId: schema.canonicalMessages.threadId,
            })
            .from(schema.canonicalMessages)
            .where(
              eq(schema.canonicalMessages.providerMessageId, providerMessageId),
            );
          expect(rows).toHaveLength(1);
          expect(rows[0]).toMatchObject({
            cycleId: canonicalCycleId,
            provider: "zapi",
            providerConnectionId: connectionId,
            providerMessageId,
            threadId,
          });
          expect(rows[0]?.metadata).toMatchObject({
            external_bot_idempotency_key: effect.idempotencyKey,
            legacy_session_id: legacySessionId,
          });
          expect(canonicalCycleId).not.toBe(legacySessionId);
          throw rollback;
        });
      } catch (error) {
        if (error !== rollback) throw error;
      } finally {
        await sqlClient.end();
      }
    });
  },
);
