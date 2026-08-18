import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { loadLocalEnv } from "../../config/loadLocalEnv.js";
import { createDrizzleCrmCanonicalInboundRepository } from "./drizzleCrmCanonicalInbound.js";
import { validateCanonicalInboundRegressions } from "./drizzleCrmCanonicalInboundRegressions.rawDbTestSupport.js";
import { expectCanonicalZapiState } from "./drizzleCrmCanonicalInboundZapi.rawDbTestSupport.js";
import {
  canonicalInbound,
  expectRejectedCanonicalConnectionStates,
  isMissingRelation,
  seedCanonicalInboundConnection,
  validateOlxCanonicalInbound,
} from "./drizzleCrmCanonicalInbound.rawDbTestSupport.js";

loadLocalEnv();

const runRawDb = process.env.RUN_RAW_CRM_DB_TESTS === "true";

describe.skipIf(!runRawDb)("canonical CRM inbound Postgres adapter", () => {
  it("persists Z-API and OLX inbound messages with scoped, replay-safe canonical state", async ({
    skip,
  }) => {
    expect(
      process.env.DATABASE_URL,
      "DATABASE_URL is required for raw CRM database validation",
    ).toBeTruthy();

    const sqlClient = postgres(process.env.DATABASE_URL ?? "", { max: 1 });
    let canonicalSchemaAvailable = true;
    try {
      await sqlClient`select 1 from crm_channel_connections limit 0`;
    } catch (error) {
      if (isMissingRelation(error)) canonicalSchemaAvailable = false;
      else throw error;
    }
    if (!canonicalSchemaAvailable) {
      await sqlClient.end();
      return skip(
        "Canonical CRM tables are unavailable; run against a prepared disposable database.",
      );
    }
    const rollback = Symbol("rollback canonical inbound validation");
    const db = drizzle(sqlClient, { schema });

    try {
      await db.transaction(async (transaction) => {
        const [scope] = await transaction
          .select({
            storeId: schema.stores.id,
            tenantId: schema.stores.tenantId,
          })
          .from(schema.stores)
          .limit(1);
        expect(scope, "Seed one store before raw CRM validation").toBeTruthy();
        if (!scope) throw new Error("Store scope is missing.");

        const repository =
          createDrizzleCrmCanonicalInboundRepository(transaction);
        const zapiConnectionId = randomUUID();
        const zapiPhone = `5511${Date.now().toString().slice(-9)}`;
        const zapiInput = canonicalInbound({
          channel: "whatsapp",
          connectionId: zapiConnectionId,
          externalThreadId: zapiPhone,
          identity: { kind: "phone", normalizedValue: zapiPhone },
          provider: "zapi",
          providerMessageId: `zapi-message-${randomUUID()}`,
          scope,
        });
        await expectRejectedCanonicalConnectionStates(
          transaction,
          repository,
          zapiInput,
          scope,
        );
        await seedCanonicalInboundConnection(transaction, {
          channel: "whatsapp",
          connectionId: zapiConnectionId,
          provider: "zapi",
          scope,
        });

        const zapiFirst = await repository.ingestInboundMessage(zapiInput);
        expect(zapiFirst.created).toBe(true);

        await transaction
          .update(schema.conversationThreads)
          .set({ metadata: { unreadCount: 0 }, state: "resolved" })
          .where(eq(schema.conversationThreads.id, zapiFirst.threadId));
        await transaction
          .update(schema.conversationAttendances)
          .set({
            handoffRequestedAt: new Date("2026-08-12T12:00:30.000Z"),
            state: "handoff_requested",
          })
          .where(eq(schema.conversationAttendances.cycleId, zapiFirst.cycleId));

        const zapiSecondMessageId = `zapi-message-${randomUUID()}`;
        const zapiSecond = await repository.ingestInboundMessage({
          ...zapiInput,
          content: "Second inbound message",
          externalThreadAliases: [zapiPhone],
          externalThreadId: `phone:${zapiPhone}`,
          occurredAt: new Date("2026-08-12T12:01:00.000Z"),
          providerMessageId: zapiSecondMessageId,
        });
        const zapiReplay = await repository.ingestInboundMessage({
          ...zapiInput,
          content: "Second inbound message",
          externalThreadAliases: [zapiPhone],
          externalThreadId: `phone:${zapiPhone}`,
          occurredAt: new Date("2026-08-12T12:01:00.000Z"),
          providerMessageId: zapiSecondMessageId,
        });

        expect(zapiSecond).toMatchObject({
          contactId: zapiFirst.contactId,
          cycleId: zapiFirst.cycleId,
          threadId: zapiFirst.threadId,
          created: true,
        });
        expect(zapiReplay).toMatchObject({
          contactId: zapiFirst.contactId,
          cycleId: zapiFirst.cycleId,
          threadId: zapiFirst.threadId,
          created: false,
        });

        await expectCanonicalZapiState(transaction, {
          connectionId: zapiConnectionId,
          first: zapiFirst,
          phone: zapiPhone,
          scope,
        });
        await validateCanonicalInboundRegressions(transaction, repository, {
          connectionId: zapiConnectionId,
          scope,
        });
        await validateOlxCanonicalInbound(transaction, repository, {
          scope,
          zapiFirst,
          zapiPhone,
        });
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      await sqlClient.end();
    }
  });
});
