import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { loadLocalEnv } from "../../config/loadLocalEnv.js";
import { seedRawAttendanceCycle } from "./drizzleCrmConversationAttendance.rawDb.testSupport.js";
import { createDrizzleCrmConversationRepository } from "./drizzleCrmConversationRepository.js";

loadLocalEnv();

describe.skipIf(process.env.RUN_RAW_CRM_DB_TESTS !== "true")(
  "CRM conversation attendance transition persistence",
  () => {
    it("atomically records one scoped event and replays without another transition", async () => {
      const sqlClient = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
      const db = drizzle(sqlClient, { schema });
      const rollback = Symbol("rollback attendance transition validation");
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
          const interventionId = randomUUID();
          const threadId = randomUUID();
          await transaction.insert(schema.crmChannelConnections).values({
            broker: "direct",
            channel: "whatsapp",
            displayName: "Raw ordinary attendance",
            id: connectionId,
            metadata: { capabilities: { inbound: true, outbound: true } },
            provider: "zapi",
            state: "active",
            storeId: scope.storeId,
            tenantId: scope.tenantId,
          });
          await transaction.insert(schema.conversationThreads).values({
            channel: "whatsapp",
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

          const repository = createDrizzleCrmConversationRepository(
            transaction,
            {
              disableTransactions: true,
            },
          );
          const occurredAt = new Date("2026-08-18T12:00:00.000Z");
          const transition = {
            actorId: "raw-attendance-operator",
            actorKind: "system" as const,
            expectedHumanAttendanceStateVersion: null,
            expectedInterventionId: null,
            expectedRevision: 0,
            expectedStatus: "ACTIVE" as const,
            humanAttendanceChangedAt: occurredAt,
            humanAttendanceState: "WAITING_HUMAN" as const,
            humanAttendanceStateVersion: 1,
            humanTakeoverAt: occurredAt,
            idempotencyKey: `ordinary-attendance:${interventionId}`,
            interventionId,
            interventionIdForLedger: interventionId,
            nextState: "WAITING_HUMAN" as const,
            occurredAt,
            previousState: null,
            reason: "raw_postgres_regression",
            requestFingerprint: randomUUID().replaceAll("-", ""),
            cycleId: cycleId,
            source: "admin",
            status: "HUMAN_TAKEOVER" as const,
            storeId: scope.storeId as StoreId,
            tenantId: scope.tenantId as TenantId,
          };

          expect(
            await repository.transitionAttendance({
              ...transition,
              expectedRevision: 99,
            }),
          ).toBeNull();
          expect(
            await repository.transitionAttendance(transition),
          ).toMatchObject({
            transitionCreated: true,
          });
          expect(
            await repository.transitionAttendance(transition),
          ).toMatchObject({
            transitionCreated: false,
          });
          await transaction.execute(
            sql`set constraints "crm_conversation_attendance_transition_has_event_trigger" immediate`,
          );

          const [attendance] = await transaction
            .select()
            .from(schema.conversationAttendances)
            .where(eq(schema.conversationAttendances.cycleId, cycleId));
          const events = await transaction
            .select()
            .from(schema.conversationAttendanceEvents)
            .where(eq(schema.conversationAttendanceEvents.cycleId, cycleId));
          expect(attendance).toMatchObject({
            interventionId,
            revision: 1,
            state: "handoff_requested",
            stateVersion: 1,
          });
          expect(events).toHaveLength(1);
          expect(events[0]).toMatchObject({
            actorId: transition.actorId,
            actorKind: transition.actorKind,
            cycleId,
            idempotencyKey: transition.idempotencyKey,
            interventionId,
            nextState: "handoff_requested",
            previousState: "bot_active",
            reason: transition.reason,
            requestFingerprint: transition.requestFingerprint,
            stateVersion: 1,
            storeId: scope.storeId,
            tenantId: scope.tenantId,
            threadId,
          });
          await expect(
            repository.transitionAttendance({
              ...transition,
              requestFingerprint: "different-fingerprint",
            }),
          ).rejects.toThrow("idempotency key was reused");
          throw rollback;
        });
      } catch (error) {
        if (error !== rollback) throw error;
      } finally {
        await sqlClient.end();
      }
    });

    it("serializes concurrent transitions before recording their event", async () => {
      const sqlClient = postgres(process.env.DATABASE_URL ?? "", { max: 4 });
      const db = drizzle(sqlClient, { schema });
      try {
        const fixture = await seedRawAttendanceCycle(db);
        const occurredAt = new Date("2026-08-18T13:00:00.000Z");
        const interventionId = randomUUID();
        const transition = {
          actorId: "raw-concurrent-attendance-operator",
          actorKind: "system" as const,
          expectedHumanAttendanceStateVersion: null,
          expectedInterventionId: null,
          expectedRevision: 0,
          expectedStatus: "ACTIVE" as const,
          humanAttendanceChangedAt: occurredAt,
          humanAttendanceState: "WAITING_HUMAN" as const,
          humanAttendanceStateVersion: 1,
          humanTakeoverAt: occurredAt,
          idempotencyKey: `concurrent-attendance:${interventionId}`,
          interventionId,
          interventionIdForLedger: interventionId,
          nextState: "WAITING_HUMAN" as const,
          occurredAt,
          previousState: null,
          reason: "raw_postgres_concurrency_regression",
          requestFingerprint: randomUUID().replaceAll("-", ""),
          cycleId: fixture.cycleId,
          source: "admin",
          status: "HUMAN_TAKEOVER" as const,
          storeId: fixture.storeId as StoreId,
          tenantId: fixture.tenantId as TenantId,
        };
        const attempt = (suffix: string) =>
          db.transaction(async (transaction) => {
            await transaction.execute(
              sql`set constraints "crm_conversation_attendance_event_matches_state_trigger" immediate`,
            );
            return createDrizzleCrmConversationRepository(transaction, {
              disableTransactions: true,
            }).transitionAttendance({
              ...transition,
              idempotencyKey: `${transition.idempotencyKey}:${suffix}`,
              requestFingerprint: `${transition.requestFingerprint}${suffix}`,
            });
          });

        const results = await Promise.all([attempt("a"), attempt("b")]);
        expect(
          results.map((result) => result?.transitionCreated ?? null).sort(),
        ).toEqual([null, true]);
        const winnerSuffix = results[0]?.transitionCreated ? "a" : "b";
        const replay = await createDrizzleCrmConversationRepository(
          db,
        ).transitionAttendance({
          ...transition,
          idempotencyKey: `${transition.idempotencyKey}:${winnerSuffix}`,
          requestFingerprint: `${transition.requestFingerprint}${winnerSuffix}`,
        });
        expect(replay?.transitionCreated).toBe(false);
        expect(
          await createDrizzleCrmConversationRepository(db).transitionAttendance(
            {
              ...transition,
              storeId: randomUUID() as StoreId,
            },
          ),
        ).toBeNull();
        const events = await db
          .select()
          .from(schema.conversationAttendanceEvents)
          .where(
            eq(schema.conversationAttendanceEvents.cycleId, fixture.cycleId),
          );
        expect(events).toHaveLength(1);
      } finally {
        await sqlClient.end();
      }
    });
  },
);
