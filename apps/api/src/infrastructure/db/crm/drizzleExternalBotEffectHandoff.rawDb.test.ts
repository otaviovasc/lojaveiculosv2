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
  "external bot canonical handoff Postgres sync",
  () => {
    it("atomically appends the transition event and advances attendance once", async () => {
      expect(process.env.DATABASE_URL).toBeTruthy();
      const sqlClient = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
      const db = drizzle(sqlClient, { schema });
      const rollback = Symbol("rollback canonical bot handoff validation");

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
          const cycleId = randomUUID();
          const effectId = randomUUID();
          const grantId = randomUUID();
          const commandId = randomUUID();
          const integrationId = randomUUID();
          const threadId = randomUUID();
          const idempotencyKey = `raw-handoff-${randomUUID()}`;
          const requestDigest = randomUUID().replaceAll("-", "");
          await transaction.insert(schema.providerConnections).values({
            broker: "direct",
            channel: "whatsapp",
            displayName: "Raw canonical handoff Z-API",
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
            customerPhone: "5511999999999",
            id: threadId,
            providerConnectionId: connectionId,
            storeId: scope.storeId,
            tenantId: scope.tenantId,
          });
          await transaction.insert(schema.conversationCycles).values({
            id: cycleId,
            threadId,
            storeId: scope.storeId,
            tenantId: scope.tenantId,
          });
          await transaction.insert(schema.conversationAttendances).values({
            cycleId,
            threadId,
            storeId: scope.storeId,
            tenantId: scope.tenantId,
          });
          await transaction.insert(schema.botIntegrationGrants).values({
            actionClass: "automatic",
            actionType: "handoff.request",
            authorizedRequestDigest: requestDigest,
            botKey: integrationId,
            consumedAt: new Date(),
            expiresAt: new Date(Date.now() + 60_000),
            id: grantId,
            integrationId,
            modelVersion: "raw-test",
            provider: "zapi",
            providerConnectionId: connectionId,
            requestDigest,
            state: "consumed",
            threadId,
            storeId: scope.storeId,
            tenantId: scope.tenantId,
            workflowProvider: "external_bot",
          });
          await transaction.insert(schema.botActionCommands).values({
            actionType: "handoff.request",
            authorizationClass: "automatic",
            expectedRevision: 0,
            grantId,
            id: commandId,
            idempotencyKey,
            input: {},
            provider: "zapi",
            providerConnectionId: connectionId,
            requestDigest,
            state: "executing",
            threadId,
            storeId: scope.storeId,
            tenantId: scope.tenantId,
          });
          await transaction.insert(schema.providerEffects).values({
            commandId,
            effectType: "handoff.request",
            id: effectId,
            idempotencyKey,
            provider: "zapi",
            providerConnectionId: connectionId,
            state: "executing",
            storeId: scope.storeId,
            tenantId: scope.tenantId,
          });
          const effect = handoffEffect({
            connectionId,
            cycleId,
            effectId,
            idempotencyKey,
            integrationId,
            requestDigest,
            storeId: scope.storeId,
            tenantId: scope.tenantId,
            threadId,
          });

          await synchronizeExternalBotEffectOutcome(transaction, { effect });
          await synchronizeExternalBotEffectOutcome(transaction, { effect });

          const [attendance] = await transaction
            .select()
            .from(schema.conversationAttendances)
            .where(eq(schema.conversationAttendances.cycleId, cycleId));
          const events = await transaction
            .select()
            .from(schema.conversationAttendanceEvents)
            .where(eq(schema.conversationAttendanceEvents.cycleId, cycleId));
          expect(attendance).toMatchObject({
            interventionId: effectId,
            revision: 1,
            state: "handoff_requested",
            stateVersion: 1,
          });
          expect(attendance?.handoffRequestedAt).toBeInstanceOf(Date);
          expect(events).toHaveLength(1);
          expect(events[0]).toMatchObject({
            actorId: integrationId,
            actorKind: "bot",
            idempotencyKey,
            interventionId: effectId,
            nextState: "handoff_requested",
            previousState: "bot_active",
            reason: "Customer requested a person",
            requestFingerprint: requestDigest,
            stateVersion: 1,
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

function handoffEffect(input: {
  connectionId: string;
  cycleId: string;
  effectId: string;
  idempotencyKey: string;
  integrationId: string;
  requestDigest: string;
  storeId: string;
  tenantId: string;
  threadId: string;
}): AuthorizedExternalBotEffect {
  return {
    canonicalCycleId: input.cycleId,
    command: {
      action: "handoff.request",
      payload: { reason: "Customer requested a person" },
    },
    connection: {
      credentialsRef: {},
      displayName: "Raw canonical handoff Z-API",
      externalConnectionId: null,
      externalInstanceId: null,
      id: input.connectionId,
      metadata: {},
      phone: null,
      provider: "zapi",
      status: "active",
      storeId: input.storeId as never,
      tenantId: input.tenantId as never,
      webhookUrl: null,
    },
    effectId: input.effectId,
    expectedRevision: 0,
    idempotencyKey: input.idempotencyKey,
    integrationId: input.integrationId,
    modelVersion: "raw-test",
    provider: "zapi",
    providerAddress: "5511999999999",
    providerConnectionId: input.connectionId,
    requestDigest: input.requestDigest,
    storeId: input.storeId,
    tenantId: input.tenantId,
    threadId: input.threadId,
  };
}
