import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { loadLocalEnv } from "../../config/loadLocalEnv.js";
import { createDrizzleCrmCanonicalInboundRepository } from "./drizzleCrmCanonicalInbound.js";
import {
  canonicalInbound,
  isMissingRelation,
  validateOlxCanonicalInbound,
} from "./drizzleCrmCanonicalInbound.rawDbTestSupport.js";

loadLocalEnv();

const runRawDb = process.env.RUN_RAW_CRM_DB_TESTS === "true";

describe.skipIf(!runRawDb)("canonical CRM inbound Postgres adapter", () => {
  it("dual-writes Z-API and OLX inbound messages with scoped, replay-safe state", async ({
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
          connectionDisplayName: "Raw Z-API canonical validation",
          connectionId: zapiConnectionId,
          externalThreadId: zapiPhone,
          identity: { kind: "phone", normalizedValue: zapiPhone },
          provider: "zapi",
          providerMessageId: `zapi-message-${randomUUID()}`,
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
          .set({ state: "handoff_requested" })
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

        const [zapiConnection] = await transaction
          .select({
            broker: schema.providerConnections.broker,
            channel: schema.providerConnections.channel,
            metadata: schema.providerConnections.metadata,
            provider: schema.providerConnections.provider,
          })
          .from(schema.providerConnections)
          .where(eq(schema.providerConnections.id, zapiConnectionId));
        expect(zapiConnection).toEqual({
          broker: "direct",
          channel: "whatsapp",
          metadata: {
            canonicalizedBy: "provider_ingress",
            capabilities: {
              inbound: true,
              outbound: true,
              templates: false,
            },
          },
          provider: "zapi",
        });

        const [zapiIdentity] = await transaction
          .select({
            channel: schema.contactIdentities.channel,
            contactId: schema.contactIdentities.contactId,
            normalizedValue: schema.contactIdentities.normalizedValue,
            provider: schema.contactIdentities.provider,
            state: schema.contactIdentities.state,
            storeId: schema.contactIdentities.storeId,
            tenantId: schema.contactIdentities.tenantId,
          })
          .from(schema.contactIdentities)
          .where(eq(schema.contactIdentities.id, zapiFirst.identityId));
        expect(zapiIdentity).toEqual({
          channel: "whatsapp",
          contactId: null,
          normalizedValue: zapiPhone,
          provider: "zapi",
          state: "observed",
          storeId: scope.storeId,
          tenantId: scope.tenantId,
        });
        expect(zapiIdentity?.contactId).toBeNull();
        const [zapiCandidate] = await transaction
          .select({ contactId: schema.contactIdentityCandidates.contactId })
          .from(schema.contactIdentityCandidates)
          .where(
            eq(
              schema.contactIdentityCandidates.identityId,
              zapiFirst.identityId,
            ),
          );
        expect(zapiCandidate?.contactId).toBe(zapiFirst.contactId);

        const [zapiThread] = await transaction
          .select({
            metadata: schema.conversationThreads.metadata,
            state: schema.conversationThreads.state,
          })
          .from(schema.conversationThreads)
          .where(eq(schema.conversationThreads.id, zapiFirst.threadId));
        expect(zapiThread?.state).toBe("open");
        expect(
          (zapiThread?.metadata as { unreadCount?: number }).unreadCount,
        ).toBe(1);

        const [zapiAttendance] = await transaction
          .select({ state: schema.conversationAttendances.state })
          .from(schema.conversationAttendances)
          .where(eq(schema.conversationAttendances.cycleId, zapiFirst.cycleId));
        expect(zapiAttendance?.state).toBe("handoff_requested");

        const zapiMessages = await transaction
          .select({
            id: schema.canonicalMessages.id,
            mediaType: schema.canonicalMessages.mediaType,
            mediaUrl: schema.canonicalMessages.mediaUrl,
            messageType: schema.canonicalMessages.messageType,
            metadata: schema.canonicalMessages.metadata,
          })
          .from(schema.canonicalMessages)
          .where(
            eq(schema.canonicalMessages.providerConnectionId, zapiConnectionId),
          );
        expect(zapiMessages).toHaveLength(2);
        expect(zapiMessages).toContainEqual(
          expect.objectContaining({
            mediaType: "image",
            mediaUrl: "https://media.test/image.jpg",
            messageType: "image",
            metadata: { provider: "zapi" },
          }),
        );

        const [zapiCycle] = await transaction
          .select({ opportunityId: schema.conversationCycles.opportunityId })
          .from(schema.conversationCycles)
          .where(eq(schema.conversationCycles.id, zapiFirst.cycleId));
        expect(zapiCycle?.opportunityId).toBeNull();
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
