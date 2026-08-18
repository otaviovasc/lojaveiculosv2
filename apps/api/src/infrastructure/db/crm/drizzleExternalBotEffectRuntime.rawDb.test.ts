import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import { eq } from "drizzle-orm";
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
    it("persists one replay-safe outbound without legacy conversation rows", async () => {
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

          const connectionId = randomUUID();
          const canonicalCycleId = randomUUID();
          const effectId = randomUUID();
          const threadId = randomUUID();
          const providerMessageId = `raw-bot-${randomUUID()}`;
          await transaction.insert(schema.providerConnections).values({
            broker: "direct",
            channel: "whatsapp",
            displayName: "Raw canonical bot sync Z-API",
            id: connectionId,
            metadata: {
              capabilities: { inbound: true, outbound: true },
              connected: true,
            },
            provider: "zapi",
            state: "active",
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
          const effect: AuthorizedExternalBotEffect = {
            canonicalCycleId,
            command: {
              action: "message.send",
              payload: { text: "Provider-confirmed bot outbound" },
            },
            connection: {
              canonical: {
                broker: "direct",
                capabilities: ["inbound", "outbound"],
                channel: "whatsapp",
                connected: true,
                degraded: false,
                errorCode: null,
                provider: "zapi",
                readiness: { ready: true, reason: null, reasonCode: "ready" },
                state: "active",
              },
              credentialsRef: {},
              displayName: "Raw canonical bot sync Z-API",
              externalConnectionId: null,
              externalInstanceId: null,
              id: connectionId,
              metadata: {},
              phone: null,
              provider: "zapi",
              status: "active",
              storeId: scope.storeId as never,
              tenantId: scope.tenantId as never,
              webhookUrl: null,
            },
            effectId,
            expectedRevision: 0,
            idempotencyKey: `raw-idempotency-${randomUUID()}`,
            integrationId: randomUUID(),
            modelVersion: "raw-test",
            provider: "zapi",
            providerAddress: "5511999999999",
            providerConnectionId: connectionId,
            requestDigest: `raw-request-${randomUUID()}`,
            storeId: scope.storeId,
            tenantId: scope.tenantId,
            threadId,
          };
          const providerOperation = {
            id: providerMessageId,
            occurredAt: new Date(),
          };

          await synchronizeExternalBotEffectOutcome(transaction, {
            effect,
            providerOperation,
          });
          await synchronizeExternalBotEffectOutcome(transaction, {
            effect,
            providerOperation,
          });

          const rows = await transaction
            .select({
              cycleId: schema.canonicalMessages.cycleId,
              metadata: schema.canonicalMessages.metadata,
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
            providerConnectionId: connectionId,
            providerMessageId,
            threadId,
          });
          expect(rows[0]?.metadata).toMatchObject({
            external_bot_effect_id: effectId,
            external_bot_idempotency_key: effect.idempotencyKey,
            provider_operation_id: providerMessageId,
          });
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
